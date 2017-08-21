const https   = require('https')
const http    = require('http')
const url     = require('url')

function two_decimals(num) {
  return (Math.floor(num * 100)/100).toString()
}

function normalize_time(time) {
  // convert fractions on time[0] to put them
  // as nanosecond scales on time[1]
  let scale = Math.floor(time[0])
  let precision = time[0] - scale;
  time[0] = scale;
  time[1] = time[1] + Math.floor(precision * 1e9)
  // if time[1] is going above 1e9 nanoscale
  // move the time[1] to time[0]
  if(time[1] > 1e9) {
    time[0] = time[0] + Math.floor(time[1]/1e9)
    time[1] = time[1] + (time[1]%1e9)
  }
  // Ensure all decimal points have been removed
  time[1] = Math.floor(time[1])
  return time
}

function sum_time(times) {
  let nano_seconds = times.reduce((a, b) => { return a + b[1] },  0)
  let seconds = times.reduce((a,b) => { return a + b[0]; }, 0)
  seconds += Math.floor(nano_seconds / 1e9)
  nano_seconds = nano_seconds % 1e9
  return [seconds, nano_seconds]
}

function avg_time(times) {
  let sums = sum_time(times);
  let avg = [sums[0] / times.length, sums[1] / times.length]
  return normalize_time(avg);
}

function min_time(times) {
  let sorted = times.sort((a, b) => { 
    if(a[0] > b[0]) return 1;
    else if (a[0] === b[0] && a[1] > b[1]) return 1; 
    else return -1;
  });
  return sorted[0];
}

function max_time(times) {
  let sorted = times.sort((a, b) => { 
    if(a[0] > b[0]) return -1;
    else if (a[0] === b[0] && a[1] > b[1]) return -1; 
    else return 1;
  });
  return sorted[0];
}

function to_number(time) {
  return time[0] + time[1] / 1e9
}

function std_time(times) {
  let avg = avg_time(times);
  let E = times.reduce((a, b) => { return a + Math.pow(to_number(b) - to_number(avg), 2); }, 0);
  let dev = Math.sqrt(E / (times.length - 1))
  return dev;
}


function est_sample_size(stddev) {
  // s = (Z-score)^2 * stddev * (1 - stddev) / (margin of error)^2 where margin of error is 0.05%, Z-score is 1.96.
  return Math.round(3.8416 * stddev * (1 - stddev) / (0.0025));
}


function confidence_interval(times) {
  let stddev  = std_time(times)
  let mean    = to_number(avg_time(times))
  let samples = times.length
  let zscore  = 1.96
  let result  = zscore * stddev / Math.sqrt(samples);
  return [Math.floor(result), (result - Math.floor(result)) * 1e9]
}

function format_time(time) {
  if(time[0] > 3600)
    return two_decimals(time[0] / 3600)           + 'h '
  else if (time[0] > 60)
    return two_decimals(time[0] / 60)             + 'm '
  else if (time[0] > 0)
    return two_decimals(time[0] + time[1] / 1e9)  + 's '
  else if (time[1].toString().length > 6) 
    return two_decimals(time[1] / 1e6)            + 'ms'
  else 
    return two_decimals(time[1] / 1e3)            + 'μs'
}

function format_bytes(bytes) {
  if(bytes > (1024 * 1024 * 1024))
    return two_decimals(bytes/(1024 * 1024 * 1024)) + 'GB'
  else if (bytes > (1024 * 1024))
    return two_decimals(bytes/(1024 * 1024))        + 'MB'
  else if (bytes > 1024)
    return two_decimals(bytes/1024)                 + 'KB'
  else 
    return bytes                                    + 'B'
}

function test(method, request_url, headers, payload, keepAlive, noDelay, allowInsecure, cb) {
  let total_time          = process.hrtime()
  let initial_time        = process.hrtime()
  let dns_lookup_time     = null
  let connect_time        = null
  let tls_time            = null
  let time_to_first_byte  = null
  let time_to_last_byte   = null
  let secure              = request_url.startsWith('https://')
  let connector           = secure ? https : http
  let options             = url.parse(request_url)

  if(allowInsecure && secure) {
    options.agent = new connector.Agent({rejectUnauthorized:false, checkServerIdentity:()=>{}});
  }
  if(headers) {
    options.headers = headers;
  } else {
    options.headers = {};
  }
  options.method = method;

  // Provide a default user agent otherwise some HTTP proxies will 
  // break.
  if(!options.headers['user-agent'] || !options.headers['User-Agent']) {
    options.headers['user-agent'] = 'whack';
  }

  let request = connector.request(options, (res) => {
    
    time_to_first_byte  = process.hrtime(initial_time)
    initial_time        = process.hrtime()
    let data            = Buffer.alloc(0)
    
    res.on('data', (chunk) => { data = Buffer.concat([data, chunk]) })
    res.on('end', () => {
      time_to_last_byte   = process.hrtime(initial_time)
      total_time          = process.hrtime(total_time)
      let samples         = {
        connect:connect_time, 
        ttfb:time_to_first_byte, 
        ttlb:time_to_last_byte, 
        total:total_time, 
        tls:secure ? tls_time : [0,0], 
        dns_lookup:dns_lookup_time ? dns_lookup_time : [0, 0], 
        size:data.length
      }
      cb(samples);
    })
  })
  request.on('socket', (socket) => {
    if(secure) {
      socket.on('secureConnect', () => {
        tls_time      = process.hrtime(initial_time)
        initial_time  = process.hrtime()
      })
    }
    socket.on('connect', () => {
      connect_time    = process.hrtime(initial_time)
      initial_time    = process.hrtime()
    })
    socket.on('lookup', () => {
      dns_lookup_time = process.hrtime(initial_time)
      initial_time    = process.hrtime()
    })
  })
  request.setNoDelay(noDelay)
  request.setSocketKeepAlive(keepAlive)
  if(payload) {
    request.write(payload)
  }
  request.end()
}

module.exports = {
  test, 
  format_bytes, 
  format_time,
  to_number,
  std_time, 
  max_time, 
  min_time, 
  avg_time, 
  normalize_time, 
  two_decimals,
  est_sample_size,
  confidence_interval
}
const https = require('https');
const http = require('http');

function two_decimals(num) {
  return (Math.floor(num * 100)/100).toString();
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

function std_time(times) {
  let avg = avg_time(times);
  let E = times.reduce((a, b) => { return a + Math.pow((b[0] - avg[0] + (b[1] - avg[1])/1e9), 2); }, 0);
  let dev = Math.sqrt(1 / times.length * E)
  return dev;
}


function est_sample_size(stddev) {
  // s = (Z-score)^2 * stddev * (1 - stddev) / (margin of error)^2 where margin of error is 0.05%, Z-score is 1.96.
  return Math.round(3.8416 * stddev * (1 - stddev) / (0.0025));
}

function to_number(time) {
  return time[0] + time[1] / 1e9
}

function confidence_interval(times) {
  let stddev  = std_time(times)
  let mean  = to_number(avg_time(times))
  let samples = times.length
  let zscore  = 1.96
  let result = 1.96 * stddev / Math.sqrt(samples);
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

function test(url, cb) {
  let total_time      = process.hrtime()
  let initial_time    = process.hrtime()
  let connect_time    = null
  let time_to_first_byte  = null
  let time_to_last_byte   = null
  let secure        = url.startsWith('https://')
  let connector       = secure ? https : http

  let request = connector.request(url, (res) => {
    
    time_to_first_byte  = process.hrtime(initial_time);
    initial_time    = process.hrtime();
    let data      = Buffer.alloc(0);

    res.on('data', (chunk) => { data = Buffer.concat([data, chunk]) })
    res.on('end', () => {
      total_time      = process.hrtime(total_time);
      time_to_last_byte   = process.hrtime(initial_time);
      cb(connect_time, time_to_first_byte, time_to_last_byte, total_time, data.length);
    })
  })
  request.on('socket', (socket) => {
    // TODO: Support https connect and secureConnect
    if(secure) {
      socket.on('secureConnect', () => {
        connect_time = process.hrtime(initial_time);
        initial_time = process.hrtime();
      })
    } else {
      socket.on('connect', () => {
        connect_time = process.hrtime(initial_time);
        initial_time = process.hrtime();
      })
    }
  })
  request.setNoDelay(true)
  request.end();
}

module.exports = {
  test, 
  format_bytes, 
  format_time, 
  std_time, 
  max_time, 
  min_time, 
  avg_time, 
  normalize_time, 
  two_decimals,
  est_sample_size,
  confidence_interval
}
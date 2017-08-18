#!/usr/bin/env node 
'use strict'
const whack = require('./index.js')
const Table = require('cli-table2')
const yargs = require('yargs');

let argv = yargs.usage('usage: $0 URL')
   .option('a', {alias:'amount', demandOption:true, default:20, describe:'The amount of samples to take.'})
   .option('c', {alias:'concurrent', demandOption:true, default:20, describe:'Maximum amount of samples to allow at once.'})
   .option('d', {alias:'data', demandOption:false, describe:'HTTP Post Data'})
   .option('X', {alias:'method', demandOption:false, default:'GET', describe:'The method to use for the requests.'})
   .option('H', {demandOption:false, describe:'Add headers to the request.'})
   .option('keep-alive', {demandOption:false, default:false, describe:'Whether to keep alive socket connections.'})
   .option('no-delay', {demandOption:false, default:true, describe:'Whether to buffer read and write data (TCP_NO_DELAY)'})
   .option('insecure', {alias:'k', demandOption:false, default:false, describe:'Whether to allow insecure (bad TLS certificate/mismatch hostname) connections.'})
   .option('version', {alias:'v', describe:'display version'})
   .wrap(yargs.terminalWidth())
   .help()
   .argv;

if(argv.version) {
  const fs = require('fs')
  const path = require('path')
  console.log(JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'package.json'))).version)
  process.exit(0)
}

if(argv._.length === 0) {
  console.log('No URL was specified. Usage: whk https://www.google.com')
  process.exit(1)
}

let responded = 0,
  expected    = argv.amount,
  running     = 0,
  allowed     = argv.concurrent,
  cts         = [], 
  ttfbs       = [], 
  ttlbs       = [], 
  tts         = [],
  dns         = [],
  tls         = [],
  total_bytes = 0,
  url         = argv._[0];

if(!url.startsWith('http://') && !url.startsWith('https://')) {
  url = 'https://' + url
}

function format(name, times, done) {
  let percent = whack.two_decimals(whack.to_number(whack.avg_time(times))/whack.to_number(whack.avg_time(done)) * 100) + '%';
  return [
    name, 
    whack.format_time(whack.avg_time(times)), 
    whack.format_time(whack.min_time(times)), 
    whack.format_time(whack.max_time(times)), 
    (times.length > 1 ? ('±'+whack.two_decimals(whack.std_time(times))) : 'n/a'),
    (times.length > 1 ? ('±'+whack.format_time(whack.confidence_interval(times))) : 'n/a'),
    percent
  ]
}

let begin_time = process.hrtime();

let cb = function (time) {
  total_bytes += time.size
  cts.push(time.connect)
  ttfbs.push(time.ttfb)
  ttlbs.push(time.ttlb)
  tts.push(time.total)
  dns.push(time.dns_lookup)
  tls.push(time.tls)
  responded++;
  running--;
  if(responded === expected) {
    let done_time       = process.hrtime(begin_time)
    let avg_est_samples = Math.round( ( 
        whack.est_sample_size(whack.std_time(cts)) + 
        whack.est_sample_size(whack.std_time(ttfbs)) + 
        whack.est_sample_size(whack.std_time(ttlbs)) + 
        whack.est_sample_size(whack.std_time(tts))
    ) / 4) 
    let table = new Table({
        chars: {
          'top':'', 'top-mid':'', 'top-left':'', 'top-right':'', 
          'bottom':'', 'bottom-mid':'', 'bottom-left':'', 'bottom-right':'', 
          'left':'', 'left-mid':'', 'mid':'', 'mid-mid':'', 
          'right':'', 'right-mid':'', 'middle':' '
        },
        style: { 'padding-left': 1, 'padding-right': 1 }
    })
    table.push(['Stat','Avg','Min','Max','+/- σ','+/- ci(95%)', 'Request%']);
    table.push(format('DNS', dns, tts))
    table.push(format('Connect', cts, tts))
    table.push(format('TLS', tls, tts))
    table.push(format('TTFB', ttfbs, tts))
    table.push(format('TTLB', ttlbs, tts))
    table.push(format('Total', tts, tts))
    console.log()
    console.log(table.toString())
    console.log()
    console.log(' ' + responded + ' requests in ' + whack.format_time(done_time) + ' (' + whack.format_bytes(total_bytes) + ' received)')
    console.log(' Requests/sec:', whack.two_decimals(responded/whack.to_number(done_time)))
    console.log(' Transfer/sec:', whack.format_bytes(total_bytes/whack.to_number(done_time)))
    if(avg_est_samples > responded) {
      console.log()
      console.log('Warning: you may need to increase the amount of tests (-a) as it')
      console.log('has too much variance to be reliable, recommended size:', avg_est_samples)
    }
    console.log()
  } else {
    run();
  }
}

let headers = null
if(argv.H) {
  if(typeof argv.H === 'string') {
    argv.H = [argv.H]
  }
  headers = {};
  argv.H.forEach((h) => { 
    if(h.indexOf(':') !== -1) {
      let tokens = h.split(':')
      headers[tokens.shift()] = tokens.join(':').trim()
    }
  })
}

let run = function() {
  if(allowed > running && (responded + running) < expected) {
    let queue = allowed - running;
    for(let i=0; i < queue; i++) {
      running++;
      whack.test(argv.method, url, headers, argv.data, argv.keepAlive, argv.noDelay, argv.insecure, cb)
    }
  }
}

console.log('Running ' + expected + ' tests @ ' + url)
console.log('Concurrently running ' + allowed + ' tests')

run();




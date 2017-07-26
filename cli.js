#!/usr/bin/env node 
'use strict'

const whack = require('./index.js')
const Table = require('cli-table2')
const yargs = require('yargs');

let argv = yargs.usage('usage: $0 URL')
   .option('d', {alias:'duration', demandOption:true, default:20, describe:'The amount of samples to take.'})
   .option('c', {alias:'concurrent', demandOption:true, default:20, describe:'Maximum amount of samples to allow at once.'})
   .help()
   .argv;

if(argv._.length === 0) {
  console.log('No URL was specified.')
  process.exit(1)
}

let responded = 0,
  expected    = argv.duration,
  running     = 0,
  allowed     = argv.concurrent,
  cts         = [], 
  ttfbs       = [], 
  ttlbs       = [], 
  tts         = [],
  total_bytes = 0,
  url         = argv._[0];

function format(name, time) {
  return [
    name, 
    whack.format_time(whack.avg_time(time)), 
    whack.format_time(whack.min_time(time)), 
    whack.format_time(whack.max_time(time)), 
    '±'+whack.two_decimals(whack.std_time(time)),
    '±'+whack.format_time(whack.confidence_interval(time))
  ]
}

let begin_time = process.hrtime();

let cb = function (connect_time, time_to_first_byte, time_to_last_byte, total_time, bytes_received) {
  total_bytes += bytes_received
  cts.push(connect_time)
  ttfbs.push(time_to_first_byte)
  ttlbs.push(time_to_last_byte)
  tts.push(total_time)
  responded++;
  running--;
  if(responded === expected) {
    let time            = whack.avg_time(tts)
    time                = time[0] + time[1] / 1e9
    let done_time       = process.hrtime(begin_time)
    let avg_est_samples = Math.round(
      ( 
        whack.est_sample_size(whack.std_time(cts)) + 
        whack.est_sample_size(whack.std_time(ttfbs)) + 
        whack.est_sample_size(whack.std_time(ttlbs)) + 
        whack.est_sample_size(whack.std_time(tts))
      ) / 4) 
    let table       = new Table({
        chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
               , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
               , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
               , 'right': '' , 'right-mid': '' , 'middle': ' ' },
        style: { 'padding-left': 1, 'padding-right': 1 }
      })
    table.push(['Stat','Avg','Min','Max','+/- σ','+/- ci(95%)']);
    table.push(format('Connect', cts))
    table.push(format('TTFB', ttfbs))
    table.push(format('TTLB', ttlbs))
    table.push(format('Total', tts))
    console.log()
    console.log(table.toString())
    console.log()
    console.log(' ' + responded + ' requests in ' + whack.format_time(done_time) + ' (' + whack.format_bytes(total_bytes) + ' received)')
    console.log(' Requests/sec:', whack.two_decimals(responded/time))
    console.log(' Transfer/sec:', whack.format_bytes(total_bytes/time))
    if(avg_est_samples > responded) {
      console.log()
      console.log('Warning: you may need to increase the amount of tests (-d) as it')
      console.log('has too much variance to be reliable, recommended size:', avg_est_samples)
    }
    console.log()
  } else {
    run();
  }
}

let run = function() {
  if(allowed > running && (responded + running) < expected) {
    let queue = allowed - running;
    for(let i=0; i < queue; i++) {
      running++;
      whack.test(url, cb)
    }
  }
}

console.log('Running ' + expected + ' tests @ ' + url)
console.log('Concurrently running ' + allowed + ' tests')
run();




const whack = require('./index.js')
const Table = require('cli-table2')
const yargs = require('yargs');


let argv = yargs.usage('usage: $0 URL')
	 .option('d', {alias:'duration', demandOption:true, default:20, describe:'The amount of samples to take.'})
	 .help()
	 .argv;

let url = null

if(argv._.length === 0) {
	console.log('No URL was specified.')
	process.exit(1)
} else {
	url = argv._[0];
}

let responded = 0;
let expected = argv.duration;
let cts = [], ttfbs = [], ttlbs = [], tts = [];
let total_bytes = 0;
let cb = function (connect_time, time_to_first_byte, time_to_last_byte, total_time, bytes_received) {
	total_bytes += bytes_received
	cts.push(connect_time)
	ttfbs.push(time_to_first_byte)
	ttlbs.push(time_to_last_byte)
	tts.push(total_time)
	responded++;
	if(responded === expected) {
		
		let time 			= whack.avg_time(tts)
		time 				= time[0] + time[1] / 1e9
		let avg_est_samples = Math.round(
			(	
				whack.est_sample_size(whack.std_time(cts)) + 
				whack.est_sample_size(whack.std_time(ttfbs)) + 
				whack.est_sample_size(whack.std_time(ttlbs)) + 
				whack.est_sample_size(whack.std_time(tts))
			) / 4) 
		let table 			= new Table({
			  chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
			         , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
			         , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
			         , 'right': '' , 'right-mid': '' , 'middle': ' ' },
			  style: { 'padding-left': 1, 'padding-right': 1 }
			})
		table.push(['','avg','min','max','σ']);
		table.push(['Connect', 	whack.format_time(whack.avg_time(cts)), 	whack.format_time(whack.min_time(cts)), 	whack.format_time(whack.max_time(cts)), 	'±'+whack.two_decimals(whack.std_time(cts))])
		table.push(['TTFB', 	whack.format_time(whack.avg_time(ttfbs)), 	whack.format_time(whack.min_time(ttfbs)), 	whack.format_time(whack.max_time(ttfbs)), 	'±'+whack.two_decimals(whack.std_time(ttfbs))])
		table.push(['TTLB', 	whack.format_time(whack.avg_time(ttlbs)), 	whack.format_time(whack.min_time(ttlbs)), 	whack.format_time(whack.max_time(ttlbs)), 	'±'+whack.two_decimals(whack.std_time(ttlbs))])
		table.push(['Total', 	whack.format_time(whack.avg_time(tts)), 	whack.format_time(whack.min_time(tts)), 	whack.format_time(whack.max_time(tts)), 	'±'+whack.two_decimals(whack.std_time(tts))])
		console.log()
		console.log(table.toString())
		console.log()
		console.log(' Received ', whack.format_bytes(total_bytes));
		console.log(' Rate     ', whack.format_bytes(total_bytes/time) + '/sec')
		if(avg_est_samples > responded) {
			console.log('')
			console.log(' Warning: you may need to increase the amount of tests as it')
			console.log(' has too much variance to be reliable, recommended size:', avg_est_samples)
		}
		console.log()
	}
}

for(let i=0; i < expected; i++)
	whack.test(url, cb)
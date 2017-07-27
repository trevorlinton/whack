# whk - A modern HTTP/TLS benchmarking tool

whk or "whack" is a modern http benchmarking and speed testing tool for http and tls websites.  

## Installation

```bash
$ npm install -g whk
```

## Usage

```bash
$ whk https://www.somewebsite.com -d 60 -c 10
```

This will run 20 concurrent tests against www.somewebsite.com

## Output

```bash                                            
Running 100 tests @ https://www.somewebsite.com
Concurrently running 10 tests

 Stat      Avg        Min        Max        +/- σ   +/- ci(95%) 
 DNS       2.28ms     658.1μs    22.6ms     ±0      ±0.47ms     
 Connect   79.57ms    28.76ms    107.46ms   ±0.02   ±5.6ms      
 TLS       84.14ms    29.34ms    109.65ms   ±0.02   ±4.64ms     
 TTFB      134.1ms    68.3ms     272.61ms   ±0.03   ±6.55ms     
 TTLB      105.32ms   44.2ms     131.39ms   ±0.02   ±5.42ms     
 Total     405.43ms   191.09ms   585.8ms    ±0.1    ±20.3ms     

 100 requests in 4.26s  (4.35MB received)
 Requests/sec: 23.44
 Transfer/sec: 1.02MB

Warning: you may need to increase the amount of tests (-d) as it
has too much variance to be reliable, recommended size: 187
```

### Measurements
* `DNS` is the amount of time to lookup the request through the local resolver.
* `Connect` is the amount of time after the DNS lookup to the request via TCP beginning and a connection being established.
* `TLS` if the connection is over https, this is the amount of time the TLS negotation and handshake took, note this does not use TLS session renegotation.
* `TTFB` is time to first byte, it's the amount of time from when the request finishes writing, and when the server returns the first byte of the response.  This is useful in measuring time taken by the server to process a request (but not the bandwidth to send the request). 
* `TTLB` is the time to last byte, iths the amount of time from when the first byte was received to when the last byte was received, including http headers.  This is useful in measuring the bandwidth speed or content sizes affect on a system.  Note that no session use is used to get an accurate measurement.
* `Total` is the total time from when the request began to the socket being closed (including any overheads).

### Analysis Columns

* `Avg` is the average time for the specific measure (the mean)
* `Min` is the minimum time found in the sample set
* `Max` is the maximum time found in the sample set
* `+/- σ` is the standard sample deviation for the set.  If you know math it can be useful.
* `+/- ci(95%)` is the 95% confidence level. 95% of the values in any future sampling with probably fall inbetween the average value +/- this number. E.g., if the average is 2 and the ci(95%) is 0.5 then there's a 95% probability that any sample will be between 1.5 and 2.5.

## Command Line Options

```bash
  -d, --duration    The amount of samples to take.      					[default: 20]
  -c, --concurrent  Maximum amount of samples to allow at once.				[default: 20]
  -X                The method to use for the requests.         			[default: "GET"]
  -H                Add headers to the request.
  --keep-alive      Whether to keep alive socket connections.   			[default: false]
  --no-delay        Whether to buffer read and write data (TCP_NO_DELAY)	[default: true]                                                 
  --help            Show help                                          		[boolean]
```

# whk - A modern HTTP/TLS benchmarking tool

whk or "whack" is a modern http benchmarking and speed testing tool for http and tls websites. whk is useful for getting reliable timing metrics for a website and to know where the majority of your problems may be in the requests. whk is not useful for load tests and not recommended for that purpose.

## Installation

```bash
$ npm install -g whk
```

## Usage

```bash
$ whk https://www.somewebsite.com -d 100 -c 10
```

This will run 20 concurrent tests against www.somewebsite.com

## Output

```bash                                            
Running 100 tests @ https://www.somewebsite.com
Concurrently running 10 tests

 Stat      Avg        Min        Max        +/- σ   +/- ci(95%)   Request% 
 DNS       2.61ms     949.51μs   23.35ms    ±0      ±0.51ms       2.28%    
 Connect   25.33ms    22.45ms    66.2ms     ±0      ±1.17ms       22.1%    
 TLS       29.71ms    22.88ms    65.33ms    ±0.01   ±2.33ms       25.91%   
 TTFB      56.69ms    43.59ms    135.01ms   ±0.01   ±3.39ms       49.45%   
 TTLB      262.72μs   103.26μs   2.15ms     ±0      ±0.05ms       0.22%    
 Total     114.64ms   92.91ms    184.32ms   ±0.02   ±4.81ms       100%     

 100 requests in 1.22s  (15.82KB received)
 Requests/sec: 81.92
 Transfer/sec: 12.96KB

Warning: you may need to increase the amount of tests (-d) as it
has too much variance to be reliable, recommended size: 187
```

### Measurements
* `DNS` is the amount of time taken to lookup the hostname (if applicable, this will be 0 if you specify an ip).  This is useful for seeing how DNS resolver affects the time to make a request.
* `Connect` is the amount of time that measures the time taken to establish a TCP/IP connection, this begins after the DNS lookup but before the TLS negotiations. This is useful in measuring the network latency of a minimal set of packets. 
* `TLS` if the connection is over https, this is the amount of time the TLS negotation and handshake took, note this does not use TLS session renegotation.  This is useful in comparing different ciphers, TLS verisons, and implementations affect on the performance.
* `TTFB` is time to first byte, it's the amount of time from when the request finishes writing, and when the server returns the first byte of the response.  This is useful in measuring time taken by the server to process a request (but not the bandwidth to send the request). 
* `TTLB` is the time to last byte, iths the amount of time from when the first byte was received to when the last byte was received, including http headers.  This is useful in measuring the bandwidth speed or content sizes affect on a system.  Note that no session use is used to get an accurate measurement.
* `Total` is the total time from when the request began to the socket being closed (including any overheads).

### Analysis Columns

* `Avg` is the average time for the specific measure (the mean)
* `Min` is the minimum time found in the sample set
* `Max` is the maximum time found in the sample set
* `+/- σ` is the standard sample deviation for the set.  If you know math it can be useful.
* `+/- ci(95%)` is the 95% confidence level. 95% of the values in any future sampling with probably fall inbetween the average value +/- this number. E.g., if the average is 2 and the ci(95%) is 0.5 then there's a 95% probability that any sample will be between 1.5 and 2.5.
* `Request%` represents on average percent of time spent in each measurement

## Command Line Options

```bash
  -d, --duration    The amount of samples to take.
  -c, --concurrent  Maximum amount of samples to allow at once
  -X                The method to use for the requests
  -H                Add headers to the request
  --keep-alive      Whether to keep alive socket connections
  --no-delay        Whether to buffer read and write data (TCP_NO_DELAY)
  --insecure, -k    Whether to allow insecure (bad TLS certificate/mismatch hostname) connections.                                              
  --help            Show help
```

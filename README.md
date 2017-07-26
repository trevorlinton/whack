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
Running 60 tests @ https://www.somewebsite.com
Concurrently running 10 tests

 Stat      Avg        Min        Max       +/- σ   +/- ci(95%) 
 Connect   37.25ms    21.18ms    71.54ms   ±0.01   ±3.32ms     
 TTFB      28.25ms    18.63ms    86.06ms   ±0      ±2.4ms      
 TTLB      297.52μs   110.69μs   2.43ms    ±0      ±0.09ms     
 Total     65.8ms     45.75ms    119ms     ±0.01   ±4.62ms     

 60 requests in 283.49ms (92.22KB received)
 Requests/sec: 911.74
 Transfer/sec: 1.36MB

Warning: you may need to increase the amount of tests (-d) as it
has too much variance to be reliable, recommended size: 187
```

### Measurements

* `Connect` is the amount of time from when the socket is opened to when the request to write to the socket can be made (but not including the write).  It includes DNS lookups, TLS/SSL handshake and negotation and IP tcp establishments.  This is useful for evaluating the time taken in network protocols outside of the application and http level.
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
  -d, --duration    The amount of samples to take.
  -c, --concurrent  Maximum amount of samples to allow at once; 
  --help            Show help 
```

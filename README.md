# whk - A modern HTTP/TLS benchmarking tool

whk or "whack" is a modern http benchmarking and speed testing tool for http and tls websites.  

## Installation

```bash
$ npm install -g whk
```

## Usage

```bash
$ whk https://www.somewebsite.com -d 20
```

This will run 20 concurrent tests against www.somewebsite.com

Output:

```bash
           avg        min        max        σ     
 Connect   132.82ms   120.3ms    160.68ms   ±0.01 
 TTFB      75.64ms    68.36ms    86.55ms    ±0    
 TTLB      44.6ms     42.49ms    47.6ms     ±0    
 Total     253.07ms   235.99ms   277.52ms   ±0    

 Received  1.08MB
 Rate      4.3MB/sec
```

## Command Line Options

```bash
-d, --duration: Total number of tests to run 

-h:             Help
```

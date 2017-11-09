var redis = require('redis')
var express = require('express')
var app = express()
var request = require("request");
var http = require('http'),
    httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})
var port_num = 8080
var alert = false
var server = http.createServer(function (req, res) {
  if (alert)
  {
      client.rpoplpush("stableserver", "stableserver", function (err, stableip) {
          console.log("redirecting to stable server " + stableip);
          proxy.web(req, res, {target: 'http://' + stableip + ':80'}, function (err) {
          });
      });
  }
  else
  {
      client.rpoplpush("serverlist", "serverlist", function (err, item) {
          console.log("serving from " + item);
          proxy.web(req, res, {target: 'http://' + item + ':80'}, function (err) {
              if (err) {
                  client.rpoplpush("stableserver", "stableserver", function (err, stableip) {
                      console.log("redirecting " + stableip);
                      proxy.web(req, res, {target: 'http://' + stableip + ':80'}, function (err) {
                      });
                  });

              }
          });
      });
  }
});
setInterval(function(){
  console.log("checking")
    client.lrange("serverlist", 0, -1, function (err, serverips) {
        console.log('http://'+serverips+":80")
        for (ip in serverips)
      {
        console.log('http://'+serverips[ip]+":80")
          request('http://'+serverips[ip]+":80", function (error, res, body) {

              if( err || res == undefined || res.statusCode !== 200)
              {
                  alert = true;
                  console.log("Error encountered! Issuing alert.");
              }
          })

      }

    })
}, 3000);
console.log("starting")
server.listen(3000);
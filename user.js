// E.g., storage for user data

exports.middleware = function(spool) {
  return cons_handler(spool);
};

var KEY = "columndefs";
var EMPTY_COLS = JSON.stringify({columns: []});

function cons_handler(spool) {
  var sig = spool.value('columndefs');
  var cols = EMPTY_COLS;
  sig.read(function(val) {
    cols = val;
  });

  var prefix = /^[/]user[/]columns/;

  function handle(req, res, next) {
    var url = req.url;
    if (req.method === 'GET' && prefix.test(url)) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(cols, 'utf8');
    }
    else if (req.method === 'POST' && prefix.test(url)) {
      var data = '';
      req.setEncoding('utf8');
      req.on('data', function(d) {
        data += d;
      });
      req.on('end', function() {
        console.warn({saving: data});
        sig.write(data);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: "saved"}));
      });
    }
    else {
      return next();
    }
  }

  return handle;
}

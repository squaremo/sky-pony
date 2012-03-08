// E.g., storage for user data

exports.middleware = function() {
  return handler;
};

function handler(req, res, next) {
  var url = req.url;
  if (req.method === 'GET' && /^[/]user[/]columns/.test(url)) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(columns), 'utf8');
  }
  else {
    return next();
  }
}

var columns = {
  columns: [
    [{formula: "atom(http://www.rabbitmq.com/blog/feed/atom/)"}]
  ]};

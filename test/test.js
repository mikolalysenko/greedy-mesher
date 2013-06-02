var compileMesher = require("../greedy.js")

var mesher = compileMesher({
  order: [1, 0],
  pre: function() {
    this.result = []
  },
  append: function(lo_x, lo_y, hi_x, hi_y, val) {
    this.result.push([[lo_x, lo_y], [hi_x, hi_y]])
  },
  post: function() {
    return this.result
  },
  debug: true
})


var test_array = require("ndarray-pack")(
[[0, 2, 0, 0],
 [0, 1, 1, 0],
 [0, 1, 1, 0],
 [0, 0, 0, 0]])

console.log(mesher(test_array))


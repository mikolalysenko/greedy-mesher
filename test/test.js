var compileMesher = require("../greedy.js")
var pack = require("ndarray-pack")

require("tape")("greedy-mesher", function(t) {

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
    }
  })


  var test_array = require("ndarray-pack")(
    [[0, 0, 0, 0],
     [0, 1, 1, 0],
     [0, 1, 1, 0],
     [0, 0, 0, 0]])

  var mesh = mesher(test_array)
  
  t.same(mesh, [
    [[0,0], [4,1]],
    [[0,1], [1,4]],
    [[1,1], [3,3]],
    [[3,1], [4,4]],
    [[1,3], [3,4]]
  ])

  t.end()
})
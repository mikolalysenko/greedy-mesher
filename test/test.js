var compileMesher = require("../greedy.js")
var ndarray = require("ndarray")
var compare = require("compare")
var pack = require("ndarray-pack")
var fill = require("ndarray-fill")
var aabb2d = require("aabb-2d")
var aabb3d = require("aabb-3d")
var test = require("tape")

var mesher = compileMesher({
  order: [0, 1],
  pre: function() {
    this.result = []
  },
  append: function(lo_x, lo_y, hi_x, hi_y, val) {
    this.result.push([[lo_x, lo_y], [hi_x, hi_y], val])
  },
  post: function() {
    return this.result
  }
})

test("greedy-mesher", function(t) {

  var test_array = require("ndarray-pack")(
    [[0, 0, 0, 0],
     [0, 1, 1, 0],
     [0, 1, 1, 0],
     [0, 0, 0, 0]])

  var mesh = mesher(test_array)

  t.same(mesh, [
    [[0,0], [4,1], 0],
    [[0,1], [1,4], 0],
    [[1,1], [3,3], 1],
    [[3,1], [4,4], 0],
    [[1,3], [3,4], 0]
  ])

  t.end()
})

function circle(x, y) {
  x -= 19
  y -= 21
  return x*x + y*y < 20*20 ? 1 : 0
}

function rect(x, y) {
  return x > 21 && x < 40 && y > 22 && y < 40
}

function noise(x, y) {
  return Math.random() > 0.5 ? 1 : 0
}

;[circle, rect, noise].map(function(filler) {
  var x = ndarray.zeros([40, 40])
  return [fill(x, filler), filler]
}).forEach(function(layout) {
  var grid = layout[0]
  var generator = layout[1]
  var name = generator.name

  test(name + ': no overlapping quads', function(t) {
    var mesh = mesher(grid).map(function(quad) {
      // Adjacent AABBs will collide - to only
      // catch overlapping quads, we shrink them
      // by 0.1 units.
      quad[1][0] -= 0.1
      quad[1][1] -= 0.1
      return aabb2d(quad[0], [
        quad[1][0] - quad[0][0],
        quad[1][1] - quad[0][1]
      ])
    })

    var safe = compare(mesh, function(a, b) {
      return !a.intersects(b)
    })

    t.ok(safe)
    t.end()
  })

  test(name + ': covers the expected points with correct values', function(t) {
    var mesh = mesher(grid)
    var w = grid.shape[0]
    var h = grid.shape[1]
    var safe = true

    for (var x = 0; x < w; x += 1)
    for (var y = 0; y < h; y += 1) {
      safe = safe && mesh.some(function(quad) {
        return quad[0][0] <= x &&
               quad[0][1] <= y &&
               quad[1][0] >= x &&
               quad[1][1] >= y &&
               quad[2] === grid.get(x, y)
      })
    }

    t.ok(safe)
    t.end()
  })
})

function sphere(x, y, z) {
  x -= 19
  y -= 20
  z -= 21
  return x*x + y*y + z*z < 20*20 ? 1 : 0
}

function cuboid(x, y, z) {
  return x > 21 && x < 31 && y > 19 && y < 29 && z > 22 && z < 30 ? 1 : 0
}

function noise3d(x, y) {
  return Math.random() > 0.1 ? 1 : 0
}

;[sphere, cuboid, noise3d].map(function(filler) {
  var x = ndarray.zeros([32, 32, 32])
  return [fill(x, filler), filler]
}).forEach(function(layout) {
  var grid = layout[0]
  var generator = layout[1]
  var name = generator.name

  var mesher = compileMesher({
    order: [0, 1, 2],
    pre: function() {
      this.result = []
    },
    append: function(lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, val) {
      this.result.push([[lo_x, lo_y, lo_z], [hi_x, hi_y, hi_z], val])
    },
    post: function() {
      return this.result
    }
  })

  test(name + ': no overlapping voxels', function(t) {
    var mesh = mesher(grid).map(function(voxel) {
      voxel[1][0] -= 0.1
      voxel[1][1] -= 0.1
      voxel[1][2] -= 0.1
      return aabb3d(voxel[0], [
        voxel[1][0] - voxel[0][0],
        voxel[1][1] - voxel[0][1],
        voxel[1][2] - voxel[0][2]
      ])
    })

    var safe = compare(mesh, function(a, b) {
      return !a.intersects(b)
    })

    t.ok(safe)
    t.end()
  })

  test(name + ': covers the expected points with the correct values', function(t) {
    var mesh = mesher(grid)
    var w = grid.shape[0]
    var h = grid.shape[1]
    var l = grid.shape[2]
    var safe = true

    for (var x = 0; x < w; x += 1)
    for (var y = 0; y < h; y += 1)
    for (var z = 0; z < l; z += 1) {
      safe = safe && mesh.some(function(voxel) {
        return voxel[0][0] <= x &&
               voxel[0][1] <= y &&
               voxel[0][2] <= z &&
               voxel[1][0] >= x &&
               voxel[1][1] >= y &&
               voxel[1][2] >= z &&
               voxel[2] === grid.get(x, y, z)
      })
    }

    t.ok(safe)
    t.end()
  })
})

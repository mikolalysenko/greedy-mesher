greedy-mesher
=============
A flexible system for generating [greedy meshes](http://0fps.wordpress.com/2012/07/07/meshing-minecraft-part-2/) of [ndarrays](https://github.com/mikolalysenko/ndarray).

## Example

```javascript
var compileMesher = require("greedy-mesher")

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
```

## Install

    npm install greedy-mesher
    
### `require("greedy-mesher")(options)`
This routine generates a greedy mesher for a given order and list of closures

* `order` An array representing the order in which to mesh the input.
* `pre(...)` A closure which is executed before meshing begins
* `post(...)` A closure which is executed after meshing completes
* `skip(a,...)` A closure which tests if the given voxel should be skipped.
* `merge(a,b,...)` A closure which tests if voxels a and b can be merged in the mesh
* `append(lo0, lo1, ..., lon, hi0, hi1, ..., hin, val, ...)`
* `num_options` The number of optional arguments to pass to each closure.
* `force_no_inline` If set, the routines are not inlined
* `debug` If set, print out the generated source code to the console

**Returns** A compiled mesh generator.  Call this method using:

```javascript
var my_mesh = mesher(array, option1, option2, ...)
```

## Credits
(c) 2013 Mikola Lysenko. MIT License


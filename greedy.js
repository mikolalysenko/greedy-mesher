"use strict"

var pool = require("typedarray-pool")
var uniq = require("uniq")
var iota = require("iota-array")

function wrap(proc, num_opts) {
  var opts = iota(num_opts).map(function(i) { return "opt" + i })
  var args = [ "proc", "pool", "array" ]
  var body = [
    "var size = array.size",
    "var visited = pool.mallocUint8(size)",
    "var result = proc(array.data, array.shape, array.stride, array.offset, visited, size" + (num_opts > 0 ? ","+opts.join(",")  : "") + ")",
    "pool.freeUint8(visited)",
    "return result"
  ].join("\n")
  var func = Function.apply(undefined, [].concat(args).concat(opts).concat([body]))
  return func.bind(undefined, proc, pool)
}

function generateMesher(order, skip, merge, append, num_options, options) {
  var code = ["'use strict'"]
  var d = order.length
  var i, j, k
  
  //Build arguments for append macro
  var append_args = new Array(2*d+1+num_options)
  for(i=0; i<d; ++i) {
    append_args[i] = "i"+i
  }
  for(i=0; i<d; ++i) {
    append_args[i+d] = "j"+i
  }
  append_args[2*d] = "oval"
  
  var opt_args = new Array(num_options)
  for(i=0; i<num_options; ++i) {
    opt_args[i] = "opt"+i
    append_args[2*d+1+i] = "opt"+i
  }

  //Type coerce offset to unsigned int
  code.push("offset = offset>>>0")
  
  //Unpack stride and shape arrays into variables
  for(var i=0; i<d; ++i) {
    code.push(["var stride",i,"=stride[",order[i],"]|0"].join(""))
    code.push(["var shape",i,"=shape[",order[i],"]|0"].join(""))
    if(i > 0) {
      code.push(["var astep",i,"=(stride",i,"-stride",i-1,"*shape",i-1,")|0"].join(""))
    } else {
      code.push(["var astep",i,"=stride",i,"|0"].join(""))
    }
    if(i > 0) {
      code.push(["var vstep",i,"=(vstep",i-1,"*shape",i-1,")|0"].join(""))
    } else {
      code.push(["var vstep",i,"=1"].join(""))
    }
    code.push(["var ustep",i,"=vstep",i].join(""))
    code.push(["var bstep",i,"=astep",i].join(""))
    code.push("var i"+i)
    code.push("var j"+i)
    code.push("var k"+i)
  }
  
  //Initialize pointers
  code.push("var a_ptr=0,b_ptr=0,u_ptr=0,v_ptr=0,i=0,d=0,val=0,oval=0")
  
  //Zero out visited map
  code.push("for(v_ptr=0;i<count;++i) {")
    code.push("visited[i]=0")
  code.push("}")
  
  //Begin traversal
  code.push("v_ptr=0")
  for(i=d-1; i>=0; --i) {
    code.push(["for(i",i,"=0;i",i,"<shape",i,";++i",i,"){"].join(""))
  }
  code.push("if(!visited[v_ptr]){")
    code.push("val = data[a_ptr]")
  
    if(skip) {
      code.push("if(!skip(val)){")
    } else {
      code.push("if(val!==0){")
    }  
      //Save val to oval
      code.push("oval = val")
  
      //Generate merging code
      for(i=0; i<d; ++i) {
        code.push("u_ptr=v_ptr+vstep"+i)
        code.push("b_ptr=a_ptr+stride"+i)
        code.push(["j",i,"_loop: for(j",i,"=1+i",i,";j",i,"<shape",i,";++j",i,"){"].join(""))
        for(j=i-1; j>=0; --j) {
          code.push(["for(k",j,"=i",j,";k",j,"<j",j,";++k",j,"){"].join(""))
        }
        
          //Check if we can merge this voxel
          code.push("if(visited[u_ptr]) { break j"+i+"_loop; }")
          code.push("val=data[b_ptr]")
        
          if(skip && merge) {
            code.push("if(skip(val) || !merge(oval,val)){ break j"+i+"_loop; }")
          } else if(skip) {
            code.push("if(skip(val) || val !== oval){ break j"+i+"_loop; }")
          } else if(merge) {
            code.push("if(val === 0 || !merge(oval,val)){ break j"+i+"_loop; }")
          } else {
            code.push("if(val === 0 || val !== oval){ break j"+i+"_loop; }")
          }
          
          //Close off loop bodies
          code.push("++u_ptr")
          code.push("b_ptr+=stride0")
        code.push("}")
        
        for(j=1; j<=i; ++j) {
          code.push("u_ptr+=ustep"+j)
          code.push("b_ptr+=bstep"+j)
          code.push("}")
        }
        if(i < d-1) {
          code.push("d=j"+i+"-i"+i)
          code.push(["ustep",i+1,"=(vstep",i+1,"-vstep",i,"*d)|0"].join(""))
          code.push(["bstep",i+1,"=(stride",i+1,"-stride",i,"*d)|0"].join(""))
        }
      }
  
      //Mark off visited table
      code.push("u_ptr=v_ptr")
      for(i=d-1; i>=0; --i) {
        code.push(["for(k",i,"=i",i,";k",i,"<j",i,";++k",i,"){"].join(""))
      }
      code.push("visited[u_ptr++]=1")
      code.push("}")
      for(i=1; i<d; ++i) {
        code.push("u_ptr+=ustep"+i)
        code.push("}")
      }
  
      //Append chunk to mesh
      code.push("append("+ append_args.join(",")+ ")")
    
    code.push("}")
  code.push("}")
  code.push("++v_ptr")
  for(var i=0; i<d; ++i) {
    code.push("a_ptr+=astep"+i)
    code.push("}")
  }
  
  if(options.debug) {
    console.log("GENERATING MESHER:")
    console.log(code.join("\n"))
  }
  
  //Compile procedure
  var args = ["append", "data", "shape", "stride", "offset", "visited", "count" ].concat(opt_args)
  if(merge) {
    args.unshift("merge")
  }
  if(skip) {
    args.unshift("skip")
  }
  args.push(code.join("\n"))
  var proc = Function.apply(undefined, args)
  
  if(skip && merge) {
    proc = proc.bind(undefined, skip, merge, append)
  } else if(skip) {
    proc = proc.bind(undefined, skip, append)
  } else if(merge) {
    proc = proc.bind(undefined, merge, append)
  } else {
    proc = proc.bind(undefined, append)
  }
  
  return wrap(proc, num_options)
}

//The actual mesh compiler
function compileMesher(options) {
  options = options || {}
  if(!options.order) {
    throw new Error("greedy-mesher: Missing order field")
  }
  if(!options.append) {
    throw new Error("greedy-mesher: Missing append field")
  }
  return generateMesher(
    options.order,
    options.skip,
    options.merge,
    options.append,
    options.extraArgs|0,
    options
  )
}
module.exports = compileMesher

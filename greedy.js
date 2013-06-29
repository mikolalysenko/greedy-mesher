"use strict"

var pool = require("typedarray-pool")
var inline = require("inlinify")
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
  
  console.log("WRAPPER:\n\n", args, opts, body)
  
  var func = Function.apply(undefined, [].concat(args).concat(opts).concat([body]))
  return func.bind(undefined, proc, pool)
}

function generateMesher(order, pre, post, skip, merge, append, num_options, options) {
  var code = []
  var d = order.length
  var i, j, k
  var can_inline = true
  var pre_macro, post_macro, skip_macro, merge_macro, append_macro
  
  //Type coerce offset to int
  code.push("offset = offset|0")
  
  //Build arguments for append macro
  var append_args = new Array(2*d+1+num_options)
  for(i=0; i<d; ++i) {
    append_args[i] = "i"+i
  }
  for(i=0; i<d; ++i) {
    append_args[i+d] = "j"+i
  }
  append_args[2*d] = "val"
  
  var opt_args = new Array(num_options)
  for(i=0; i<num_options; ++i) {
    opt_args[i] = "opt"+i
    append_args[2*d+1+i] = "opt"+i
  }

  try {
    if(options.force_no_inline) {
      throw new Error("Forced non-inline")
    }
    //Compile all the macros
    pre_macro     = inline(pre, "pre_", opt_args)
    post_macro    = inline(post, "post_", opt_args)
    skip_macro    = inline(skip, "skip_", ["val"].concat(opt_args))
    merge_macro   = inline(merge, "merge_", ["val", "oval"].concat(opt_args))
    append_macro  = inline(append, "append_", append_args)
    
  } catch(e) {
    console.warn("WARNING!  Could not inline methods, performance will be lowered: ", e)
    
    var opt_str = num_opts > 0 ? "," + opt_args.join(",") : ""
    
    pre_macro = {
      this_variables: ["this_"],
      variables: [],
      return_variable: "return_pre_",
      body: "this_ = {}; return_pre_=pre_func.call(this_"+opt_str+")"
    };
    post_macro = {
      this_variables: ["this_"],
      variables: [],
      return_variable: "return_post_",
      body: "return_post_=post_func.call(this_"+opt_str+")"
    };
    skip_macro = {
      this_variables: ["this_"],
      variables: [],
      return_variable: "return_skip_",
      body: "return_skip_=skip_func.call(this_,val"+opt_str+")"
    };
    merge_macro = {
      this_variables: ["this_"],
      variables: [],
      return_variable: "return_merge_",
      body: "return_merge_=merge_func.call(this_,val,oval"+opt_str+")"
    };
    append_macro = {
      this_variables: ["this_"],
      variables: [],
      return_variable: "return_append_",
      body: "return_append_=append_func.call(this_," + append_args.join(",") + ")"
    };
    can_inline = false
  }
  
  //Combine this variables, add to result
  var combined_vars = [ pre_macro.return_variable,
                        post_macro.return_variable,
                        skip_macro.return_variable,
                        merge_macro.return_variable,
                        append_macro.return_variable ]
                        .concat(pre_macro.this_variables)
                        .concat(post_macro.this_variables)
                        .concat(skip_macro.this_variables)
                        .concat(merge_macro.this_variables)
                        .concat(append_macro.this_variables)
                        .concat(pre_macro.variables)
                        .concat(post_macro.variables)
                        .concat(skip_macro.variables)
                        .concat(merge_macro.variables)
                        .concat(append_macro.variables)
  code.push("var " + uniq(combined_vars).join(","))
  
  code.push("var d")
  
  //Unpack stride and shape arrays into variables
  for(var i=0; i<d; ++i) {
    code.push("var stride"+i+"=stride["+order[i]+"]|0")
    code.push("var shape"+i+"=shape["+order[i]+"]|0")
    if(i > 0) {
      code.push("var astep"+i+"=(stride"+i+"-stride"+(i-1)+"*shape"+(i-1)+")|0")
    } else {
      code.push("var astep"+i+"=stride"+i+"|0")
    }
    if(i > 0) {
      code.push("var vstep"+i+"=(vstep"+(i-1)+"*shape"+(i-1)+")|0")
    } else {
      code.push("var vstep"+i+"=1")
    }
    code.push("var ustep"+i+"=vstep"+i)
    code.push("var bstep"+i+"=astep"+i)
    code.push("var i"+i)
    code.push("var j"+i)
    code.push("var k"+i)
  }
  
  //Initialize pointers
  code.push("var a_ptr=0")
  code.push("var b_ptr=0")
  code.push("var u_ptr=0")
  code.push("var v_ptr=0")
  code.push("var val")
  code.push("var oval")
  
  //Paste in premacro
  code.push(pre_macro.body)
  
  //Zero out visited map
  
  code.push("for(v_ptr=0,i=0;i<count;++i) {")
    code.push("visited[i]=0")
  code.push("}")
  
  //Begin traversal
  code.push("v_ptr=0")
  for(i=d-1; i>=0; --i) {
    code.push("for(i"+i+"=0;i"+i+"<shape"+i+";++i"+i+"){")
  }
  code.push("if(!visited[v_ptr]){")
    code.push("val = data[a_ptr]")
    code.push(skip_macro.body)
    code.push("if(!" + skip_macro.return_variable + "){")
  
      //Save val to oval
      code.push("oval = val")
  
      //Generate merging code
      for(i=0; i<d; ++i) {
        code.push("u_ptr=v_ptr+vstep"+i)
        code.push("b_ptr=a_ptr+stride"+i)
        code.push("j"+i+"_loop: for(j"+i+"=1+i"+i+";j"+i+"<shape"+i+";++j"+i+"){")
        for(j=i-1; j>=0; --j) {
          code.push("for(k"+j+"=i"+j+";k"+j+"<j"+j+";++k"+j+"){")
        }
        
          //Check if we can merge this voxel
          code.push("if(visited[u_ptr]) { break j"+i+"_loop; }")
          code.push("val=data[b_ptr]")
          code.push(skip_macro.body)
          code.push("if("+skip_macro.return_variable+") { break j"+i+"_loop; }")
          code.push(merge_macro.body)
          code.push("if(!"+merge_macro.return_variable+") { break j"+i+"_loop; }")
          
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
          code.push("ustep"+(i+1)+"=(vstep"+(i+1)+"-vstep"+i+"*d)|0")
          code.push("bstep"+(i+1)+"=(stride"+(i+1)+"-stride"+i+"*d)|0")
        }
      }
  
      //Mark off visited table
      code.push("u_ptr=v_ptr")
      for(i=d-1; i>=0; --i) {
        code.push("for(k"+i+"=i"+i+";k"+i+"<j"+i+";++k"+i+"){")
      }
      code.push("visited[u_ptr++]=1")
      code.push("}")
      for(i=1; i<d; ++i) {
        code.push("u_ptr+=ustep"+i)
        code.push("}")
      }
  
      //Append chunk to mesh
      code.push("val = oval")
      code.push(append_macro.body)
    
    code.push("}")
  code.push("}")
  code.push("++v_ptr")
  for(var i=0; i<d; ++i) {
    code.push("a_ptr+=astep"+i)
    code.push("}")
  }
  
  //Run post macro
  code.push(post_macro.body)
  code.push("return " + post_macro.return_variable)
  
  if(options.debug) {
    console.log("GENERATING MESHER:")
    console.log(code.join("\n"))
  }
  
  //Compile procedure
  var args = ["data", "shape", "stride", "offset", "visited", "count" ].concat(opt_args)
  args.push(code.join("\n"))
  var proc
  if(can_inline) {
    proc = Function.apply(undefined, args)
  } else {
    tmp_proc = Function.apply(undefined, ["pre_func", "post_func", "skip_func", "merge_func", "append_func"].concat(args))
    proc = tmp_proc.bind(undefined, pre, post, skip, merge, append)
  }
  
  console.log(args)
  
  return wrap(proc, num_options)
}

//Default stuff
function DEFAULT_PRE()        { }
function DEFAULT_POST()       { }
function DEFAULT_SKIP()       { return false; }
function DEFAULT_MERGE(a, b)  { return a === b; }
function DEFAULT_APPEND()     { }
function compileMesher(options) {
  options = options || {}
  if(!options.order) {
    throw new Error("Missing order field")
  }
  return generateMesher(
    options.order,
    options.pre         || DEFAULT_PRE,
    options.post        || DEFAULT_POST,
    options.skip        || DEFAULT_SKIP,
    options.merge       || DEFAULT_MERGE,
    options.append      || DEFAULT_APPEND,
    options.num_options|0,
    options
  )
}
module.exports = compileMesher

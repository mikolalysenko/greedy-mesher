function greedyMesh() {
  offset = offset | 0;
  var this_result;
  var _pre_return;
  var _post_return;
  var _skip_return;
  var _merge_return;
  var _append_return;
  var stride0 = stride[1] | 0;
  var shape0 = shape[1] | 0;
  var astep0 = stride0 | 0;
  var vstep0 = 1;
  var ustep0 = vstep0;
  var bstep0 = astep0;
  var i0;
  var j0;
  var k0;
  var stride1 = stride[0] | 0;
  var shape1 = shape[0] | 0;
  var astep1 = stride1 - stride0 * shape0 | 0;
  var vstep1 = vstep0 * shape0 | 0;
  var ustep1 = vstep1;
  var bstep1 = astep1;
  var i1;
  var j1;
  var k1;
  var a_ptr = 0;
  var b_ptr = 0;
  var u_ptr = 0;
  var v_ptr = 0;
  var val;
  var oval;
  {
    this_result = [];
  }
  for (v_ptr = 0, i = 0; i < count; ++i) {
    visited[i] = 0;
  }
  v_ptr = 0;
  for (i1 = 0; i1 < shape1; ++i1) {
    for (i0 = 0; i0 < shape0; ++i0) {
      if (!visited[v_ptr]) {
        val = data[a_ptr];
        __skip__return:
          do {
            {
              _skip_return = false;
              break __skip__return;
            }
          } while (0);
        if (!_skip_return) {
          oval = val;
          u_ptr = v_ptr + vstep0;
          b_ptr = a_ptr + stride0;
          j0_loop:
            for (j0 = 1 + i0; j0 < shape0; ++j0) {
              if (visited[u_ptr]) {
                break j0_loop;
              }
              val = data[b_ptr];
              __skip__return:
                do {
                  {
                    _skip_return = false;
                    break __skip__return;
                  }
                } while (0);
              if (_skip_return) {
                break j0_loop;
              }
              __merge__return:
                do {
                  {
                    _merge_return = val === oval;
                    break __merge__return;
                  }
                } while (0);
              if (!_merge_return) {
                break j0_loop;
              }
              ++u_ptr;
              b_ptr += stride0;
            }
          ustep1 = vstep1 - vstep0 * j0 | 0;
          bstep1 = stride1 - stride0 * j0 | 0;
          u_ptr = v_ptr + vstep1;
          b_ptr = a_ptr + stride1;
          j1_loop:
            for (j1 = 1 + i1; j1 < shape1; ++j1) {
              for (k0 = i0; k0 < j0; ++k0) {
                if (visited[u_ptr]) {
                  break j1_loop;
                }
                val = data[b_ptr];
                __skip__return:
                  do {
                    {
                      _skip_return = false;
                      break __skip__return;
                    }
                  } while (0);
                if (_skip_return) {
                  break j1_loop;
                }
                __merge__return:
                  do {
                    {
                      _merge_return = val === oval;
                      break __merge__return;
                    }
                  } while (0);
                if (!_merge_return) {
                  break j1_loop;
                }
                ++u_ptr;
                b_ptr += stride0;
              }
              u_ptr += ustep1;
              b_ptr += bstep1;
            }
          u_ptr = v_ptr;
          for (k1 = i1; k1 < j1; ++k1) {
            for (k0 = i0; k0 < j0; ++k0) {
              visited[u_ptr++] = 1;
            }
            u_ptr += ustep1;
          }
          val = oval;
          {
            this_result.push([
              [
                i0,
                i1
              ],
              [
                j0,
                j1
              ]
            ]);
          }
        }
      }
      ++v_ptr;
      a_ptr += astep0;
    }
    a_ptr += astep1;
  }
  __post__return:
    do {
      {
        _post_return = this_result;
        break __post__return;
      }
    } while (0);
  return _post_return;
}
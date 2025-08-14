export const add = (array1, array2) => {
  var i, length = array1.length
  for (i = 0; i < length; i++)
    array1[i] += array2[i]
  return array1
}

export const map = (array, func) => {
  var i, length
  for (i = 0, length = array.length; i < length; i++) array[i] = func(array[i])
  return array
}

export const duplicate = (array) => {
  return copy(array, new Float32Array(array.length))
}

export const copy = (array1, array2) => {
  var i, length
  for (i = 0, length = array1.length; i < length; i++) array2[i] = array1[i]
  return array2
}
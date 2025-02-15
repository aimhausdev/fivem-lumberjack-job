// returns a random number in the range [min, max]
export const rand = (min: number, max: number) => min + (max - min)*Math.random()

// returns the dot product between two 3-vectors
export const dot = (a: number[], b: number[]) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]

// returns the length of a given 3-vector
export const len = (vec: number[]) => Math.sqrt(dot(vec, vec))

// subtracts one 3-vector from another
export const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

// returns the distance between two points in R^3
export const dist = (a: number[], b: number[]) => len(sub(a, b))

// returns result of normalizing a given 3-vector
export const normalize = (vec: number[]) => {
  const l = len(vec)
  const [x, y, z] = vec
  return [x/l, y/l, z/l]
}

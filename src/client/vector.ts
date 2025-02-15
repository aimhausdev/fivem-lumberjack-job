export const rand = (min: number, max: number) => min + (max - min)*Math.random()
export const dot = (a: number[], b: number[]) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
export const len = (vec: number[]) => Math.sqrt(dot(vec, vec))
export const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const dist = (a: number[], b: number[]) => len(sub(a, b))
export const normalize = (vec: number[]) => {
  const l = len(vec)
  const [x, y, z] = vec
  return [x/l, y/l, z/l]
}

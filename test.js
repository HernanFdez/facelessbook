class A {
  constructor(x) {
    this.v = x
  }
}

class B extends A {
  constructor(z) {
    super(z)
    this.m = z
  }
}

let a = new A(1)
let b = new B(2)

console.log(a.v)
console.log(b.v)

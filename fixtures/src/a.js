NEJ.define(["{pro}dep1.js", "{pro}dep2.js", "{pro}dep3.js"], function () {
  var eu = NEJ.P('edu.u');
  var a = eu;
  var b = a;

  eu.some = 1;
  eu.same = 1;

  eu.some1 = 2;

  b.fn();
  eu.fn1();
  eu.fn2();
  console.log(eu.v);
});
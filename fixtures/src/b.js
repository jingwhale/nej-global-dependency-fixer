NEJ.define(['{pro}/dep1.js'], function (dep1) {
  var eu = NEJ.P('edu.e');
  var eu1 = NEJ.P('edu.u');

  eu.some = 2;
  eu1.same = 1;

  var c = {};

  c.a = 1;
  c.b = 2;

  var c1 = {};
  c1.a = 1;
  c1.b = 2;

  NEJ.copy(NEJ.P('edu.c'), c);
  NEJ.copy(NEJ.P('edu.c1'), c1);
  NEJ.P('edu.c2').a = 1;
  NEJ.P('edu.c2').b = 1;
  NEJ.P('edu.c2').c.c1.c2.c3.c4 = 1;
  use(NEJ.P('edu.c2').c);

  var used = NEJ.P('edu.c2').c.c1.c2.c3;
});
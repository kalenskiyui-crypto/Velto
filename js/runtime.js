/*
 * Velto page runtime.
 *
 * The page markup lives in <template id="vl-tpl"> as plain HTML with a few
 * extras: {{path}} holes in text and attributes, <sc-for list="{{items}}"
 * as="item"> loops and <sc-if value="{{flag}}"> branches. This file compiles
 * that template once and renders it with Preact, so the logic class in app.js
 * (class Component extends DCLogic) works like a normal Preact class
 * component: state, setState, refs, lifecycle and DOM events.
 */
(function () {
  "use strict";
  var h = preact.h;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  // Attributes that are present-means-true in HTML; "" must become true for Preact.
  var BOOL = { autoplay: 1, muted: 1, loop: 1, playsinline: 1, required: 1, disabled: 1, checked: 1, hidden: 1, open: 1, novalidate: 1 };

  function lookup(scope, path) {
    if (path === "true") return true;
    if (path === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    var parts = path.split("."), v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    var m = WHOLE.exec(str);
    if (m) return lookup(scope, m[1]);
    if (str.indexOf("{{") < 0) return str;
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? "" : String(v);
    });
  }

  function compile(node) {
    if (node.nodeType === 3) return { text: node.nodeValue };
    if (node.nodeType !== 1) return null;
    var attrs = [];
    for (var i = 0; i < node.attributes.length; i++) {
      attrs.push([node.attributes[i].name, node.attributes[i].value]);
    }
    return { tag: node.localName, attrs: attrs, kids: compileList(node.childNodes) };
  }

  function compileList(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var c = compile(list[i]);
      if (c) out.push(c);
    }
    return out;
  }

  function attr(n, name) {
    for (var i = 0; i < n.attrs.length; i++) if (n.attrs[i][0] === name) return n.attrs[i][1];
    return null;
  }

  function renderList(nodes, scope, out) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.text !== undefined) {
        out.push(n.text.indexOf("{{") < 0 ? n.text : n.text.replace(HOLE, function (_, p) {
          var v = lookup(scope, p);
          return v == null ? "" : String(v);
        }));
        continue;
      }
      if (n.tag === "sc-for") {
        var items = interp(attr(n, "list") || "", scope) || [];
        var as = attr(n, "as") || "item";
        for (var k = 0; k < items.length; k++) {
          var s = Object.create(scope);
          s[as] = items[k];
          s.$index = k;
          renderList(n.kids, s, out);
        }
        continue;
      }
      if (n.tag === "sc-if") {
        if (interp(attr(n, "value") || "", scope)) renderList(n.kids, scope, out);
        continue;
      }
      var props = {};
      for (var a = 0; a < n.attrs.length; a++) {
        var name = n.attrs[a][0];
        if (name.indexOf("hint-") === 0) continue;
        var v = interp(n.attrs[a][1], scope);
        if (v === undefined) continue;
        if (BOOL[name] && v === "") v = true;
        props[name] = v;
      }
      var kids = [];
      renderList(n.kids, scope, kids);
      out.push(h(n.tag, props, kids));
    }
  }

  var tpl = document.getElementById("vl-tpl");
  var TREE = compileList(tpl.content.childNodes);

  window.DCLogic = class DCLogic extends preact.Component {
    render() {
      var out = [];
      renderList(TREE, this.renderVals(), out);
      return h(preact.Fragment, null, out);
    }
  };

  window.vlMount = function (Component, defaults) {
    preact.render(h(Component, defaults || {}), document.getElementById("app"));
  };
})();

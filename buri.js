function Buri(id, opt) {
  var opt = this.opt = opt || {};
  opt.width = opt.width || 800;
  opt.height = opt.height || 300;
  opt.anchorRadius = opt.anchorRadius || 8;
  opt.anchorStrokeWidth = opt.anchorStrokeWidth || 3;
  opt.anchorStroke = opt.anchorStroke || 'black';

  opt.startColor = opt.startColor || '#f99';
  opt.defaultColor = opt.defaultColor || '#9f9';
  opt.endColor = opt.endColor || '#99f';

  this.stage = new Kinetic.Stage({
    container: id,
    width: opt.width,
    height: opt.height
  });
  this.init(opt);
  return this;
}

Buri.prototype.plot = function(ds) {
  var layer = this.stage.get('#PlotLayer')[0];
  var width = this.opt.width, height = this.opt.height;
  var plot = layer.get('#Plot')[0];
  var ps = [0, height];
  for (var i = 0; i < ds.length; i++) {
    ps.push(ds[i][0] * width, height - (ds[i][1] * height));
  }
  ps = ps.concat([width, height]);
  plot.setPoints(ps);
  this.stage.draw();
};

Buri.prototype.init = function(opt) {
  var selectCb = null;
  Buri.prototype.select = function(cb) {
    selectCb = cb;
  };
  var changeCb = null;
  Buri.prototype.change = function(cb) {
    changeCb = cb;
  }
  var stage = this.stage;
  // 表レイヤー
  var plotLayer = new Kinetic.Layer({zIndex: 1, id: 'PlotLayer'});
  var plot = new Kinetic.Polygon({points: [0, 0], id: 'Plot'});
  plotLayer.add(plot);
  stage.add(plotLayer);

  // 半透明レイヤー
  var alphaLayer = new Kinetic.Layer({zIndex: 2, id: 'AlphaLayer'});
  stage.add(alphaLayer);
  var alphaPly = new Kinetic.Polygon({
    alpha: 0.8,
    fill: '#fff',
    points: [0, 0]
  });
  alphaLayer.add(alphaPly);

  // クリック検知用レイヤー
  var ovarlayLayer = new Kinetic.Layer({zIndex: 3, id: 'OverlayLayer'});
  stage.add(ovarlayLayer);
  var ovarlayRect = new Kinetic.Rect({
    alpha: 0.0,
    height: stage.getHeight(),
    width: stage.getWidth()
  });
  ovarlayLayer.add(ovarlayRect);

  // アンカー，ガイド線用レイヤー
  var anchorLayer = new Kinetic.Layer({zIndex: 4, id: 'AnchorLayer'});
  var anchorGuide = new Kinetic.Line({
    zIndex: 2,
    points: [0, 0],
    strokeWidth: 2,
    stroke: 'black'
  });
  stage.add(anchorLayer);
  anchorLayer.add(anchorGuide);
  var anchors = [];
  var selected = null;
  var selectAnchor = function(anchor) {
    if(selectCb && selected != anchor) {
      selectCb(anchor);
    }
    selected = anchor;
  };

  // update
  var update = function() {
    var ps = anchors.map(function(a) {
      return [a.getX(), a.getY()];
    }).reduce(function(a, b) {
      return a.concat(b);
    });
    anchorGuide.setPoints(ps);
    if(anchors.length >= 1) {
      for(var i = 1; i < anchors.length - 1; i++) {
        anchors[i].setDragBounds({
          right: anchors[i+1].getX(),
          left: anchors[i-1].getX(),
        });
      }
      var h = stage.getHeight(), w = stage.getWidth();
      var qs = [0, 0, 0, h, ps[0], h];
      qs = qs.concat(ps);
      qs = qs.concat([ps[ps.length - 2], h, w, h, w, 0]);
      alphaPly.setPoints(qs);
      var cs = anchors.map(function(a) {
        return [a.getX()/stage.getWidth(), a.getFill()];
      }).reduce(function(a, b) {
        return a.concat(b);
      });
      plot.setFill({
        start: {x: 0, y: 0},
        end: {x: stage.getWidth(), y: 0},
        colorStops: cs
      });
    }
    stage.draw();
    if(changeCb) {
      changeCb();
    }
  };

  // ソート済みのAnchorを取得
  var sortAnchors = function() {
    anchors = stage.get('#AnchorLayer')[0].get('.anchor').sort(function(a, b) {
      return a.getX() - b.getX();
    });
  };

  var addAnchor = function(x, y, color, flag) {
    color = color || opt.defaultColor;
    flag = flag || false;
    var anchor = new Kinetic.Circle({
      x: x,
      y: y,
      zIndex: 1,
      radius: opt.anchorRadius,
      draggable: true,
      fill: color,
      name: 'anchor',
      shadow: {color: "black", blur: 5, offset: [6, 4], alpha: 0.4},
      stroke: opt.anchorStroke,
    });
    if(flag) {
      anchor.setDragBounds({
        top: 0,
        bottom: stage.getHeight(),
        left: x,
        right: x
      });
    }

    anchor.on('click', function() {
      selectAnchor(anchor);
    });

    anchor.on('dragmove', function() {
      selectAnchor(anchor);
      update();
    });

    anchor.on('dblclick', function() {
      if(!flag) {
        anchorLayer.remove(anchor);
        sortAnchors();
        update();
      }
    });

    anchorLayer.add(anchor);
    sortAnchors();
    selectAnchor(anchor);
    update();
  };

  ovarlayRect.on('dblclick', function(e) {
    addAnchor(e.offsetX, e.offsetY);
  });
  addAnchor(0, stage.getHeight()*0.5, opt.startColor, true);
  addAnchor(stage.getWidth(), stage.getHeight() * 0.5, opt.endColor, true);
  Buri.prototype.update = update;

  Buri.prototype.getPoints = function() {
    return anchors.map(function(a) {
      return {
        x: a.getX()/stage.getWidth(),
        y: a.getY()/stage.getHeight(),
        color: (new RGBColor(a.getFill())).toHex()
      };
    });
  }
};

// 从参考课件 LessonZK.js (L12_v1_cskj_05) 提取的 GameUtils 工具类源码。
// 嵌入到导出的 LessonZK.js 中，提供答案判断、错误提示、确认按钮绑定等通用能力。
// 注意：本字符串内容会原样写入 lessonJs 的 IIFE 中，依赖 com.klzz.* 全局可用。

export const GAME_UTILS_SOURCE = `    // ─── GameUtils ───
    var KlInputImage = com.klzz.ui.custom.KeyBoard.KlInputImage;
    var KlKeyboardEvent = com.klzz.ui.custom.KeyBoard.KlKeyboardEvent;
    var Event = Laya.Event;
    var GameUtils = (function () {
      function GameUtils() {}
      GameUtils.checkGroupAnswer = function (_klInputBox, _answer) {
        var _anGroupArr = _answer.split("|");
        var wId = this.checkSingleGroup(_klInputBox, _anGroupArr[0]);
        for (var i = 1; i < _anGroupArr.length; ++i) {
          var w2 = this.checkSingleGroup(_klInputBox, _anGroupArr[i]);
          if (wId.length > w2.length) wId = w2;
        }
        return wId;
      };
      GameUtils.checkSingleAnswer = function (_klInputBox, _answer) {
        return this.checkSingleGroup(_klInputBox, _answer);
      };
      GameUtils.checkSingleGroup = function (_klInputBox, _an) {
        var _anArr = _an.split(",");
        if (_klInputBox.numChildren != _anArr.length) {
          console.error("_klBox.numChildren != answer num, please check!");
          return null;
        }
        var wIdArr = [];
        var sameNum = 0;
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (_kImg) {
            var hasSame = false;
            for (var j = sameNum; j < _anArr.length; j++) {
              if (_anArr[j] === _kImg.fontClipValue) {
                this.swapValue(_anArr, sameNum, j);
                sameNum = sameNum + 1;
                hasSame = true;
                break;
              }
            }
            if (!hasSame) wIdArr.push(i);
          } else {
            console.error("_kImg is not exit,please check!");
            return null;
          }
        }
        return wIdArr;
      };
      GameUtils.swapValue = function (_swapArr, _swapA, _swapB) {
        var tmp = _swapArr[_swapA];
        _swapArr[_swapA] = _swapArr[_swapB];
        _swapArr[_swapB] = tmp;
      };
      GameUtils.checkAnswerInKlInputImg = function (_klInputImg, _anStr, _separator) {
        var _an = _klInputImg.fontClipValue;
        if (_klInputImg.valueOrSkinIsNull) return false;
        var _anArr1 = _an.split(_separator);
        var _anArr2 = _anStr.split(_separator);
        if (_anArr1.length != _anArr2.length) return false;
        for (var i = 0; i < _anArr1.length; ++i) {
          var hasSame = false;
          for (var j = i; j < _anArr1.length; ++j) {
            if (_anArr1[i] == _anArr2[j]) {
              this.swapValue(_anArr2, i, j);
              hasSame = true;
              break;
            }
          }
          if (!hasSame) return false;
        }
        return true;
      };
      GameUtils.checkWArr = function (_klInputBox, _answer) {
        var tmpStrArr = _answer.split(",");
        var _wArr = [];
        for (var i = 0; i < tmpStrArr.length; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (!_kImg) {
            console.error("_kImg is not exit,please check!");
          } else {
            var tmpStrArr2 = tmpStrArr[i].split("&");
            var hasSame = false;
            for (var j = 0; j < tmpStrArr2.length; j++) {
              if (_kImg.fontClipValue == tmpStrArr2[j]) {
                hasSame = true;
                break;
              }
            }
            if (!hasSame) _wArr.push(i);
          }
        }
        return _wArr;
      };
      GameUtils.checkFirst = function (_newArr, _oldArr) {
        if (_newArr.length != _oldArr.length) {
          console.error("_newArr's length != _oldArr's length");
          return false;
        }
        for (var i = 0; i < _newArr.length; ++i) {
          if (_newArr[i] > _oldArr[i]) return true;
        }
      };
      GameUtils.checkSpecialAn = function (_klInputBox, _answer) {
        var _anGroup = _answer.split("|");
        var _wArr = this.checkWArr(_klInputBox, _anGroup[0]);
        if (_wArr.length == 0) return _wArr;
        for (var i = 1; i < _anGroup.length; ++i) {
          var _wArr1 = this.checkWArr(_klInputBox, _anGroup[i]);
          if (_wArr1.length < _wArr.length) {
            _wArr = _wArr1;
          } else if (_wArr1.length == _wArr.length) {
            if (this.checkFirst(_wArr1, _wArr)) _wArr = _wArr1;
          }
        }
        return _wArr;
      };
      GameUtils.checkSingleAn = function (_klInputImage, _answer, _separator) {
        var _anGroup = _answer.split(_separator);
        for (var i = 0; i < _anGroup.length; ++i) {
          if (_klInputImage.fontClipValue == _anGroup[i]) return true;
        }
        return false;
      };
      GameUtils.checkSpecialAn3 = function (_klInputBox, _answer, norCheckNum, _separator) {
        var _anGroup = _answer.split(",");
        var _wArr = [];
        for (var i = 0; i < _anGroup.length; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (!this.checkKImg3(_kImg, _anGroup[i], norCheckNum, _separator)) _wArr.push(i);
        }
        return _wArr;
      };
      GameUtils.checkKImg3 = function (_klInputImage, _answer, norCheckNum, _separator) {
        if (norCheckNum > _answer.length) return false;
        if (norCheckNum > _klInputImage.fontClipValue.length) return false;
        var _inputAn = _klInputImage.fontClipValue.substr(0, norCheckNum);
        var _an1 = _answer.substr(0, norCheckNum);
        if (_inputAn != _an1) return false;
        var _inputAn2 = _klInputImage.fontClipValue.substr(norCheckNum);
        var _an2 = _answer.substr(norCheckNum);
        var _anArr = _an2.split(_separator);
        var _inputArr = _inputAn2.split(_separator);
        if (_anArr.length != _inputArr.length) return false;
        for (var i = 0; i < _anArr.length; ++i) {
          var hasSame = false;
          for (var j = i; j < _anArr.length; ++j) {
            if (_anArr[i] == _inputArr[j]) {
              if (i != _anArr.length - 1) {
                var tmp = _inputArr[i];
                _inputArr[i] = _inputArr[j];
                _inputArr[j] = tmp;
              }
              hasSame = true;
            }
          }
          if (!hasSame) return false;
        }
        return true;
      };
      GameUtils.checkSpecialAn2 = function (_klInputBox, _answer, _separator) {
        var _anGroup = _answer.split(",");
        var _wArr = [];
        for (var i = 0; i < _anGroup.length; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (!this.checkKImg(_kImg, _anGroup[i], _separator)) _wArr.push(i);
        }
        return _wArr;
      };
      GameUtils.checkKImg = function (_klInputImage, _answer, _separator) {
        var _anArr = _answer.split(_separator);
        var _inputArr = _klInputImage.fontClipValue.split(_separator);
        if (_anArr.length != _inputArr.length) return false;
        for (var i = 0; i < _anArr.length; ++i) {
          var hasSame = false;
          for (var j = i; j < _anArr.length; ++j) {
            if (_anArr[i] == _inputArr[j]) {
              if (i != _anArr.length - 1) {
                var tmp = _inputArr[i];
                _inputArr[i] = _inputArr[j];
                _inputArr[j] = tmp;
              }
              hasSame = true;
            }
          }
          if (!hasSame) return false;
        }
        return true;
      };
      GameUtils.addTipsOrDisBox = function (_btnTipsOrDis, _btnCloseTipsOrDis, _tipsOrDisBox, isTips, _btnConfirm) {
        if (_btnConfirm === void 0) _btnConfirm = null;
        var self = this;
        var showTipsOrDisBox = function (isShow) { _tipsOrDisBox.visible = isShow; };
        var onBtnTipsOrDis = function () {
          if (isTips) com.klzz.game.KlEventCenter.event("btnClick", ["tipsBtnClick"]);
          showTipsOrDisBox(_btnTipsOrDis.isSelected);
          if (_btnConfirm) _btnConfirm.visible = !_btnTipsOrDis.isSelected;
        };
        var onBtnCloseTipsOrDis = function () {
          _btnTipsOrDis.isSelected = false;
          showTipsOrDisBox(_btnTipsOrDis.isSelected);
          if (_btnConfirm) _btnConfirm.visible = !_btnTipsOrDis.isSelected;
        };
        _btnTipsOrDis.on(Event.CLICK, self, onBtnTipsOrDis);
        _btnCloseTipsOrDis.on(Event.CLICK, self, onBtnCloseTipsOrDis);
        showTipsOrDisBox(false);
      };
      GameUtils.addTipsAndDisBox = function (_btnTips, _btnCloseTips, _tipsBox, _btnDis, _btnCloseDis, _disBox, _btnConfirm) {
        if (_btnConfirm === void 0) _btnConfirm = null;
        var self = this;
        var showDisBox = function (isShow) { _disBox.visible = isShow; };
        var showTipsBox = function (isShow) { _tipsBox.visible = isShow; };
        var onBtnDis = function () {
          showDisBox(_btnDis.isSelected);
          _btnTips.isSelected = false;
          showTipsBox(false);
          if (_btnConfirm) _btnConfirm.visible = !_btnDis.isSelected;
        };
        var onBtnCloseDis = function () {
          _btnDis.isSelected = false;
          showDisBox(_btnDis.isSelected);
          if (_btnConfirm) _btnConfirm.visible = !_btnDis.isSelected;
        };
        var onBtnTips = function () {
          com.klzz.game.KlEventCenter.event("btnClick", ["tipsBtnClick"]);
          showTipsBox(_btnTips.isSelected);
          _btnDis.isSelected = false;
          showDisBox(false);
          if (_btnConfirm) _btnConfirm.visible = !_btnTips.isSelected;
        };
        var onBtnCloseTips = function () {
          _btnTips.isSelected = false;
          showTipsBox(_btnTips.isSelected);
          if (_btnConfirm) _btnConfirm.visible = !_btnTips.isSelected;
        };
        _btnTips.on(Event.CLICK, self, onBtnTips);
        _btnCloseTips.on(Event.CLICK, self, onBtnCloseTips);
        _btnDis.on(Event.CLICK, self, onBtnDis);
        _btnCloseDis.on(Event.CLICK, self, onBtnCloseDis);
        showTipsBox(false);
        showDisBox(false);
      };
      GameUtils.addBtnShow = function (_btn, _btnClose, _sceneBox, isTips, syncDone, syncClose, _view) {
        if (_btnClose === void 0) _btnClose = null;
        if (isTips === void 0) isTips = false;
        if (syncDone === void 0) syncDone = null;
        if (syncClose === void 0) syncClose = null;
        if (_view === void 0) _view = null;
        var self = this;
        var showBtnBox = function (isShow) {
          _sceneBox.visible = isShow;
          if (isShow) { syncDone && syncDone.call(_view); }
          else { syncClose && syncClose.call(_view); }
        };
        var onBtn = function () {
          if (isTips) com.klzz.game.KlEventCenter.event("btnClick", ["tipsBtnClick"]);
          showBtnBox(_btn.isSelected);
        };
        var onBtnClose = function () {
          _btn.isSelected = false;
          showBtnBox(_btn.isSelected);
        };
        _btn.on(Event.CLICK, self, onBtn);
        if (_btnClose) _btnClose.on(Event.CLICK, self, onBtnClose);
        showBtnBox(false);
      };
      GameUtils.addBtnShow2 = function (_btn, _btnClose, _sceneBox, isTips, _btnConfirm, syncDone, _view) {
        if (_btnClose === void 0) _btnClose = null;
        if (isTips === void 0) isTips = false;
        if (_btnConfirm === void 0) _btnConfirm = null;
        if (syncDone === void 0) syncDone = null;
        if (_view === void 0) _view = null;
        var self = this;
        var showBtnBox = function () {
          var _light = _btn.getChildAt(0);
          if (_light) {
            _light.visible = !_light.visible;
            _sceneBox.visible = _light.visible;
            if (_btnConfirm) _btnConfirm.visible = !_sceneBox.visible;
          }
        };
        var onBtn = function () {
          if (isTips) com.klzz.game.KlEventCenter.event("btnClick", ["tipsBtnClick"]);
          showBtnBox();
          if (syncDone && _view) syncDone.call(_view);
        };
        var onBtnClose = function () {
          var _light = _btn.getChildAt(0);
          if (_light) _light.visible = false;
          _sceneBox.visible = false;
          if (_btnConfirm) _btnConfirm.visible = true;
        };
        _btn.on(Event.CLICK, self, onBtn);
        if (_btnClose) _btnClose.on(Event.CLICK, self, onBtnClose);
        _sceneBox.visible = false;
      };
      GameUtils.initDraw = function (_view, _btnDraw, _btnReFresh, _newBrushSp) {
        var onBtnDraw = function () {
          _newBrushSp.visible = _btnDraw.isSelected;
          _btnReFresh.visible = _btnDraw.isSelected;
        };
        var onBtnReFresh = function () { _newBrushSp.undoDraw(); };
        _btnDraw.on(Event.CLICK, _view, onBtnDraw);
        _btnReFresh.on(Event.CLICK, _view, onBtnReFresh);
      };
      GameUtils.addConfirm = function (_view, _btnConfirm, _klInputBox, _lockBox) {
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        var onBtnConfirm = function () {
          if (_klInputBox.isRight()) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            _view.showAnswerFace(1);
          } else {
            _view.showAnswerFace(2);
            self.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
      };
      GameUtils.initConfirm = function (_view, _btnConfirm, _klInputBox, _hook, _lockBox, otherCb, doBeforeAFace, doAfterAFace) {
        if (_hook === void 0) _hook = null;
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        var onBtnConfirm = function () {
          if (_klInputBox.isRight()) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            if (_hook) _hook.visible = true;
            self.showHook(_klInputBox);
            if (doBeforeAFace) doBeforeAFace.call(_view);
            _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
          } else {
            _view.showAnswerFace(2);
            self.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips(_klInputBox);
        this.registerInputHit(_klInputBox, otherCb, _view);
      };
      GameUtils.initConfirm2 = function (_view, _btnConfirm, _klInputBox, _hook, _lockBox, otherCb, doAfterAFace) {
        if (_hook === void 0) _hook = null;
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        var onBtnConfirm = function () {
          if (_klInputBox.isRight()) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            if (_hook) _hook.visible = true;
            self.showHook(_klInputBox);
            _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
          } else {
            _view.showAnswerFace(2);
            self.showWrongTips2(_klInputBox, _klInputBox.getWrongIdx());
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
      };
      GameUtils.initConfirm3 = function (_view, _btnConfirm, _choiceBox, _showWrongTips, _lockBox, otherCb, doAfterAFace) {
        if (_showWrongTips === void 0) _showWrongTips = true;
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        var onBtnConfirm = function () {
          if (_choiceBox.isRight) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
          } else {
            _view.showAnswerFace(2);
            if (_showWrongTips) {
              for (var i = 0; i < _choiceBox.numChildren; ++i) {
                var _sele = _choiceBox.getChildAt(i);
                if (_sele && _sele.isSelected) {
                  var wImg = _sele.getChildByName("wrong");
                  if (wImg) wImg.visible = true;
                }
              }
            }
          }
        };
        var onHitSele = function () {
          for (var i = 0; i < _choiceBox.numChildren; ++i) {
            var _sele = _choiceBox.getChildAt(i);
            if (_sele) {
              var wImg = _sele.getChildByName("wrong");
              if (wImg) wImg.visible = false;
            }
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        for (var i = 0; i < _choiceBox.numChildren; ++i) {
          var _sele2 = _choiceBox.getChildAt(i);
          if (_sele2) _sele2.on(Laya.Event.CLICK, self, onHitSele);
        }
      };
      GameUtils.initFractionConfirm = function (_view, _btnConfirm, _klInputBox, _klInputBox1, specialStr, _lockBox) {
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        this.initFractionBox(_klInputBox, _klInputBox1, specialStr);
        this.resetWrongTips(_klInputBox);
        var onBtnConfirm = function () {
          var isRight = true;
          if (_klInputBox.answer != null && _klInputBox1.answer != null) {
            isRight = _klInputBox.isRight() || _klInputBox1.isRight();
          } else {
            var _checkInputBox = _klInputBox.answer == null ? _klInputBox1 : _klInputBox;
            isRight = _checkInputBox.isRight();
          }
          if (isRight) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            _view.showAnswerFace(1);
          } else {
            _view.showAnswerFace(2);
            self.showWrongTips(_klInputBox, [0]);
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
      };
      GameUtils.initFractionConfirm2 = function (_view, _btnConfirm, _klInputBox, cb, _lockBox, _rightTips) {
        var self = this;
        this.resetWrongTips(_klInputBox);
        this.registerInputHit(_klInputBox);
        var onBtnConfirm = function () {
          if (_klInputBox.isRight()) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            if (_rightTips) {
              _rightTips.visible = true;
              _btnConfirm.visible = false;
            }
            if (cb) cb.call(_view);
            _view.showAnswerFace(1);
          } else {
            _view.showAnswerFace(2);
            self.showWrongTips(_klInputBox, _klInputBox.getWrongIdx());
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
      };
      GameUtils.initChoiceBoxConfirm = function (_view, _btnConfirm, _choiceBox, _hook, _lockBox, otherCb, doBeforeAFace, doAfterAFace) {
        if (_hook === void 0) _hook = null;
        if (_lockBox === void 0) _lockBox = null;
        var self = this;
        var onBtnConfirm = function () {
          if (_choiceBox.isRight) {
            if (_lockBox) _lockBox.visible = true;
            else _view.mouseEnabled = false;
            if (_hook) _hook.visible = true;
            if (doBeforeAFace) doBeforeAFace.call(_view);
            _view.showAnswerFace(1, Laya.Handler.create(_view, doAfterAFace));
          } else {
            _view.showAnswerFace(2);
            for (var i = 0; i < _choiceBox.numChildren; ++i) {
              var _sele = _choiceBox.getChildAt(i);
              if (_sele.isSelected) self.showWrongTipsBySeleObj(_sele, true);
            }
          }
        };
        _btnConfirm.on(Event.CLICK, _view, onBtnConfirm);
        this.resetWrongTips2(_choiceBox);
        this.registerSeleObjHit(_choiceBox);
      };
      GameUtils.resetKlInputSize = function (_klInputBox, _scaleN) {
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (_kImg) _kImg.fontClip.scale(_scaleN, _scaleN);
        }
      };
      GameUtils.resetInputBoxSize = function (_inputBox, _scaleN) {
        for (var i = 0; i < _inputBox.numChildren; ++i) {
          var _kImg = _inputBox.getChildAt(i);
          if (_kImg) _kImg.fontClip.scale(_scaleN, _scaleN);
        }
      };
      GameUtils.resetInputImgSize = function (_parent, _scaleN) {
        for (var i = 0; i < _parent.numChildren; ++i) {
          var _item = _parent.getChildAt(i);
          if (_item && _item instanceof KlInputImage) _item.fontClip.scale(_scaleN, _scaleN);
        }
      };
      GameUtils.resetSingleInputImgSize = function (_klImg, _scaleN) {
        _klImg.fontClip.scale(_scaleN, _scaleN);
      };
      GameUtils.resetWrongTips2 = function (_choiceBox) {
        for (var i = 0; i < _choiceBox.numChildren; ++i) {
          var _item = _choiceBox.getChildAt(i);
          if (_item) this.showWrongTipsBySeleObj(_item, false);
        }
      };
      GameUtils.resetWrongTips = function (_klInputBox) {
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (_kImg) this.showWrongTipsByKImg(_kImg, false);
        }
      };
      GameUtils.resetWrongTipsInBox = function (_inputBox) {
        for (var i = 0; i < _inputBox.numChildren; ++i) {
          var _kImg = _inputBox.getChildAt(i);
          if (_kImg) this.showWrongTipsByKImg(_kImg, false);
        }
      };
      GameUtils.showWrongTipsByKImg = function (_kImg, isShow) {
        var _wImg = _kImg.getChildByName("wrong");
        if (_wImg) _wImg.visible = isShow;
      };
      GameUtils.showWrongTipsBySeleObj = function (_seleObj, isShow) {
        var _wImg = _seleObj.getChildByName("wrong");
        if (_wImg) _wImg.visible = isShow;
      };
      GameUtils.registerSeleObjHit = function (_choiceBox, otherCb, _view) {
        var self = this;
        var doFunc = function (_seleObj, isShow) {
          for (var i = 0; i < _choiceBox.numChildren; ++i) {
            var _seleObj2 = _choiceBox.getChildAt(i);
            if (_seleObj2) self.showWrongTipsBySeleObj(_seleObj2, isShow);
          }
          if (otherCb && _view) otherCb.call(_view);
        };
        for (var i = 0; i < _choiceBox.numChildren; ++i) {
          var _seleObj = _choiceBox.getChildAt(i);
          if (_seleObj) _seleObj.on(Event.CLICK, self, doFunc, [_seleObj, false]);
        }
      };
      GameUtils.registerInputHit = function (_klInputBox, otherCb, _view) {
        var self = this;
        var doFunc = function (_klImg, isShow) {
          self.showWrongTipsByKImg(_klImg, isShow);
          if (otherCb && _view) otherCb.call(_view);
        };
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (_kImg) _kImg.on(Event.CLICK, self, doFunc, [_kImg, false]);
        }
      };
      GameUtils.registerInputBoxHit = function (_box, otherCb, _view) {
        var self = this;
        var doFunc = function (_klImg, isShow) {
          self.showWrongTipsByKImg(_klImg, isShow);
          if (otherCb && _view) otherCb.call(_view);
        };
        for (var i = 0; i < _box.numChildren; ++i) {
          var _kImg = _box.getChildAt(i);
          if (_kImg) _kImg.on(Event.CLICK, self, doFunc, [_kImg, false]);
        }
      };
      GameUtils.registerKImgHit = function (_kImg, otherCb, _view) {
        var self = this;
        var doFunc = function (_klImg, isShow) {
          self.showWrongTipsByKImg(_klImg, isShow);
          if (otherCb && _view) otherCb.call(_view);
        };
        if (_kImg) _kImg.on(Event.CLICK, self, doFunc, [_kImg, false]);
      };
      GameUtils.showWrongTips = function (_klInputBox, wArr) {
        for (var i = 0; i < wArr.length; ++i) {
          var _klImg = _klInputBox.getChildAt(wArr[i]);
          if (_klImg) this.showWrongTipsByKImg(_klImg, true);
        }
      };
      GameUtils.showWrongTips2 = function (_klInputBox, wArr) {
        for (var i = 0; i < wArr.length; ++i) {
          var _klImg = _klInputBox.getChildAt(wArr[i]);
          if (_klImg) this.showBlinkTipsByKImg(_klImg);
        }
      };
      GameUtils.showBlinkTipsByKImg = function (_kImg) {
        if (_kImg) {
          var _tw = _kImg.getChildByName("tw");
          if (_tw) _tw.play("shan", true, 0, 1, 3000);
        }
      };
      GameUtils.showHook = function (_klInputBox) {
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _klImg = _klInputBox.getChildAt(i);
          if (_klImg) {
            var _hook = _klImg.getChildByName("_hook");
            if (_hook) _hook.visible = true;
          }
        }
      };
      GameUtils.initFractionBox = function (_klInputBox, _klInputBox1, specialStr) {
        var self = this;
        for (var i = 0; i < _klInputBox.numChildren; ++i) {
          var _kImg = _klInputBox.getChildAt(i);
          if (_kImg) {
            _kImg.on(Event.CLICK, self, self.showWrongTipsByKImg, [_kImg, false]);
            _kImg.on(KlKeyboardEvent.INPUT_LATER, self, self.onFractionBoxChange, [_kImg, _klInputBox1, specialStr]);
          }
        }
        for (var j = 0; j < _klInputBox1.numChildren; ++j) {
          var _kImg2 = _klInputBox1.getChildAt(j);
          if (_kImg2) _kImg2.on(Event.CLICK, self, self.resetWrongTips, [_klInputBox]);
        }
        _klInputBox1.visible = false;
      };
      GameUtils.onFractionBoxChange = function (_kImg, _klInputBox1, specialStr) {
        var idx = _kImg.fontClipValue.indexOf(specialStr);
        if (idx != -1) {
          if (idx == 0) {
            _klInputBox1.visible = true;
            for (var i = 0; i < _klInputBox1.numChildren; ++i) {
              var _kImg2 = _klInputBox1.getChildAt(i);
              if (_kImg2) _kImg2.fontClipValue = " ";
            }
            _kImg.fontClipValue = specialStr;
          } else {
            _klInputBox1.visible = false;
            _kImg.fontClipValue = _kImg.fontClipValue.substring(0, idx);
          }
        } else {
          _klInputBox1.visible = false;
        }
      };
      GameUtils.registerInputSync = function (_mainInputImg, _kImg, cb, _view) {
        if (_kImg) _kImg.on(KlKeyboardEvent.INPUT_LATER, this, this.syncInput, [_mainInputImg, _kImg, cb, _view]);
      };
      GameUtils.syncInput = function (_mainInputImg, _kImg, cb, _view) {
        if (_mainInputImg && _kImg) {
          this.showWrongTipsByKImg(_mainInputImg, false);
          _mainInputImg.fontClipValue = _kImg.fontClipValue;
          if (cb && _view) cb.call(_view);
        }
      };
      GameUtils.addSummary = function (_btnSummary, _btnBack, _summary, _lockBox) {
        var showSummary = function (isShow) { _summary.visible = isShow; };
        var showLockBox = function (isShow) { _lockBox.visible = isShow; };
        var onBtnSummary = function () { showSummary(true); };
        var onBtnBack = function () { showSummary(false); };
        showSummary(false);
        showLockBox(false);
        _btnSummary.on(Event.CLICK, this, onBtnSummary);
        _btnBack.on(Event.CLICK, this, onBtnBack);
      };
      GameUtils.addMoveSummary = function (_view, _btnSummary, _btnBack, _summaryBox, _lockBox) {
        var showSummary = function (isShow) { _summaryBox.visible = isShow; };
        var showLockBox = function (isShow) { _lockBox.visible = isShow; };
        var onBtnSummary = function () {
          var _box = _summaryBox.getChildAt(1);
          var _mask = _summaryBox.getChildAt(0);
          if (_box && _mask) {
            showSummary(true);
            _box.x = 1920;
            _mask.visible = true;
            _summaryBox.mouseThrough = false;
            _view.KlTween.toNew(_box, { x: 0 }, 500, Laya.Ease.sineInOut);
          }
        };
        var onBtnBack = function () {
          var _box = _summaryBox.getChildAt(1);
          var _mask = _summaryBox.getChildAt(0);
          if (_box && _mask) {
            _box.x = 0;
            _mask.visible = false;
            _summaryBox.mouseThrough = true;
            _view.KlTween.toNew(_box, { x: 1920 }, 500, Laya.Ease.sineInOut);
          }
        };
        _summaryBox.mouseThrough = true;
        _view.KlTween.isNewMode = true;
        _btnSummary.on(Event.CLICK, _view, onBtnSummary);
        _btnBack.on(Event.CLICK, _view, onBtnBack);
        showSummary(false);
        showLockBox(false);
      };
      GameUtils.analysisAnswer = function (_anStr, _separator, preStr, lastStr) {
        var _anArr = _anStr.split(_separator);
        var outArr = [];
        this.analysisCal(_anArr, 0, _anArr.length - 1, _separator, outArr);
        var outStr = "";
        for (var i = 0; i < outArr.length; ++i) {
          var tmpStr = outArr[i];
          if (preStr) tmpStr = preStr + tmpStr;
          if (lastStr) tmpStr = tmpStr + lastStr;
          outStr = outStr + tmpStr;
          if (i != outArr.length - 1) outStr = outStr + "&";
        }
        return outStr;
      };
      GameUtils.analysisCal = function (_anArr, _start, _len, _separator, outArr) {
        if (_start == _len) {
          var _str = "";
          for (var i = 0; i <= _len; ++i) {
            _str = _str + _anArr[i];
            if (i != _len) _str = _str + _separator;
          }
          outArr.push(_str);
        } else {
          for (var j = _start; j <= _len; ++j) {
            this.swapValue(_anArr, _start, j);
            this.analysisCal(_anArr, _start + 1, _len, _separator, outArr);
            this.swapValue(_anArr, _start, j);
          }
        }
      };
      GameUtils.playRightSound = function (_view) { _view.playSound(this.sound_ding); };
      GameUtils.playWrongSound = function (_view) { _view.playSound(this.sound_wrong); };
      GameUtils.addClickEvent = function (_view, buttons, func) {
        for (var i = 0; i < buttons.length; ++i) {
          var btn = buttons[i];
          btn.on(Laya.Event.CLICK, _view, func, [btn]);
        }
      };
      GameUtils.checkStep = function (_view, _check1, _check2, _show1, _show2, _show3, _closeMask, doFunc) {
        if (_check2 === void 0) _check2 = null;
        if (_show1 === void 0) _show1 = null;
        if (_show2 === void 0) _show2 = null;
        if (_show3 === void 0) _show3 = null;
        if (_closeMask === void 0) _closeMask = null;
        if (doFunc === void 0) doFunc = null;
        var _anRight = true;
        if (_check1 && _check1.fontClipValue != _check1.cus1) { this.showWrongTipsByKImg(_check1, true); _anRight = false; }
        if (_check2 && _check2.fontClipValue != _check2.cus1) { this.showWrongTipsByKImg(_check2, true); _anRight = false; }
        if (_anRight) {
          this.playRightSound(_view);
          _check1.mouseEnabled = false;
          if (_check2) _check2.mouseEnabled = false;
          if (_show1) _show1.visible = true;
          if (_show2) _show2.visible = true;
          if (_show3) _show3.visible = true;
          if (_closeMask) _closeMask.visible = false;
          if (doFunc) doFunc.call(_view);
        } else {
          this.playWrongSound(_view);
        }
      };
      GameUtils.activeInput = function (input) {
        if (input == null) {
          KlKeyboardEvent.instance.event(KlKeyboardEvent.HIDE_KEYBOARDS);
          return;
        }
        input.callLater(function () { input.event(Laya.Event.CLICK, { target: input }); });
      };
      GameUtils.addInputBoxAutoNext = function (thisView, inputBox) {
        this.addInputBoxInputEvent(inputBox, thisView, function (input, index) {
          if (index >= inputBox.numChildren - 1) return;
          var ipx = inputBox.getChildAt(index + 1);
          GameUtils.activeInput(ipx);
        });
      };
      GameUtils.addInputBoxInputEvent = function (inputBox, thisCall, func) {
        for (var i = 0; i < inputBox.numChildren; i++) {
          var input = inputBox.getChildAt(i);
          input.on(KlKeyboardEvent.INPUT_LATER, thisCall, func, [input, i]);
        }
      };
      GameUtils.autoAddFont = function (_kImg, _view, func) {
        _kImg["inputValidator"] = func.bind(_view);
      };
      GameUtils.sound_ding = "share/sound/rush_flag.wav";
      GameUtils.sound_click = "share/sound/btn_click.wav";
      GameUtils.sound_wrong = "share/sound/anwser_wrong.wav";
      return GameUtils;
    }());
`;

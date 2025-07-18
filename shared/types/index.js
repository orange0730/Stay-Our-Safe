"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeverityLevel = exports.HazardType = void 0;
// 災害類型
var HazardType;
(function (HazardType) {
    HazardType["FLOOD"] = "flood";
    HazardType["ROADBLOCK"] = "roadblock";
    HazardType["COLLAPSE"] = "collapse";
    HazardType["FIRE"] = "fire";
    HazardType["LANDSLIDE"] = "landslide";
    HazardType["OTHER"] = "other"; // 其他
})(HazardType || (exports.HazardType = HazardType = {}));
// 災害嚴重程度
var SeverityLevel;
(function (SeverityLevel) {
    SeverityLevel[SeverityLevel["LOW"] = 1] = "LOW";
    SeverityLevel[SeverityLevel["MEDIUM"] = 2] = "MEDIUM";
    SeverityLevel[SeverityLevel["HIGH"] = 3] = "HIGH";
    SeverityLevel[SeverityLevel["CRITICAL"] = 4] = "CRITICAL"; // 極高風險
})(SeverityLevel || (exports.SeverityLevel = SeverityLevel = {}));
//# sourceMappingURL=index.js.map
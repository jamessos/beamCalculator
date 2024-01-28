
class pointLoad {
    constructor (x, mag){
        this.x = x //distance from the left
        this.mag = mag //magnatude of the load pointing downwards
        this.relx = 0
        this.dragged = false
        this.index = 0
        this.enable = true
    }
}


class uniformLoad {
    constructor (start, end, f){
        this.start = start
        this.end = end
        this.mag = nerdamer (f)

        this.relStart = 0
        this.relEnd = 0
        this.enable = true
    }
}


class loadSet {
    constructor () {
        this.x = 0 //position of head of train
        this.spacing = [100]
        this.mags = [200, 100]
        this.loads = []
        this.size = 0
        this.updateLoads()
    }
    updateLoads () {
        this.loads = []
        let currentX = 0
        let cycle = 0
        for (let i = 0; i < this.mags.length; i++) {
            this.loads.push (currentX)
            if (i == this.mags.length-1) {
                break
            }
            currentX += this.spacing[cycle]/1
            cycle++
            if (cycle >= this.spacing.length){
                cycle = 0
            }
        }
        this.size = currentX
        for (let i = 0; i < this.loads.length; i++) {
            this.loads[i] -= currentX
            this.loads[i] = new pointLoad (this.loads[i], this.mags[i])
        }
    }
    updatePosition (x) {
        this.x = x
        this.updateLoads()
    }
    addLoad (mag) {
        this.mags.push (mag)
        this.updateLoads ()
    }
    addSpacing (spacing) {
        this.spacing.push (spacing)
    }
    removeSpacing () {
        if (this.spacing.length > 1) {
            this.spacing.pop ()
        }
    }
    changeSpacing (spacing) {
        this.spacing = []
        for (let i = 0; i < spacing.length; i++) {
            this.spacing.push (spacing[i]/1)
        }
        this.updateLoads ()
    }
    getLoads () {
        let returnVar = []
        for (let i = 0; i < this.loads.length; i++) {
            returnVar.push (new pointLoad (this.loads[i].x+this.x, this.loads[i].mag))
        }
        return (returnVar)
    }
    resetSpacing () {
        this.spacing = [100]
    }
}

class layer {
    constructor (H, wdH, wdL) {
        this.H = H
        this.wdH = wdH
        this.wdL = wdL
    }
}

class section {
    constructor (L) {
        this.L = L
        this.layers = [new layer (1.27, 100, 1),  new layer (1.27, (1.27+5)*2, 1), new layer (75-2*1.27, 1.27*2, 1), new layer (1.27, 80, 1)]
        //this.layers = [new layer (100, 100, 1)]
    }
}

class bridge {
    constructor () {
        this.loads = []
        this.uniformLoads = []
        this.loadSets = []
        this.sections = [new section (1200)] 
        this.I = 0
        this.L = 0
        this.T = 0
        this.QandB = []
        this.centroid = 0
        this.calculateLength ()
        this.supportA = 0
        this.supportB = 0
        this.currentSection = 0
        this.currentLayer = 0
        this.currentLength = 0
        this.currentThickness = 0
        this.currentCrossSection = []
        this.calculationLocation = 0
        this.SFD = []
        this.BMD = []

        this.shearStress = []
        this.momentStress = []
        this.interval = 1
        //this.interval = 5

        this.SFDEnvalope = []
        this.SFDEnvalope = JSON.parse(localStorage.getItem ("sfdEnvalope"))
        this.BMDEnvalope = []
        this.BMDEnvalope = JSON.parse(localStorage.getItem ("bmdEnvalope"))


        
        
        this.tensionLimit = []
        this.compressionLimit = []
        this.maxMomentCapacity = 0

        this.shearLimit = []
        this.shearGlueLimit = []
    }
    calculateLength () {
        this.L = 0
        for (let i = 0; i < this.sections.length; i++) {
            this.L += this.sections[i].L/1
        }
        this.estimateThickness ()
    }
    estimateThickness () {
        this.T = 0
        let candidate = 0
        for (let i = 0; i < this.sections.length; i++) {
            candidate = 0
            for (let j = 0; j < this.sections[i].layers.length; j++) {
                candidate += Math.max (math.evaluate((this.sections[i].layers[j].H.toString()).replaceAll ("x", this.L/2))/1)
            }
            candidate = candidate*1.5
            if (candidate > this.T){
                this.T = candidate
            }
        }
    }

    calculateThickness () {
        this.currentThickness = 0
        for (let j = 0; j < this.sections[this.currentSection].layers.length; j++) {
            this.currentThickness += math.evaluate((this.sections[this.currentSection].layers[j].H.toString()).replaceAll ("x", this.currentLength))/1
        }
    }

    addSection () {
        this.sections.push (new section (1200))
        this.currentLayer = 0
        this.calculateLength ()
        this.lastSection ()
        makeCrossSection (this, document.getElementById ("csd"))
    }
    
    nextSection () {
        this.currentSection += 1
        if (this.currentSection >= this.sections.length) {
            this.currentSection = 0
        }
        this.currentLayer = 0
        updateSetting (this)
        makeCrossSection (this, document.getElementById ("csd"))
    }
    lastSection () {
        this.currentSection = this.sections.length - 1
        updateSetting (this)
    }
    prevSection () {
        this.currentSection -= 1
        if (this.currentSection < 0) {
            this.currentSection = this.sections.length - 1
        }
        this.currentLayer = 0
        updateSetting (this)
        makeCrossSection (this, document.getElementById ("csd"))
    }

    addLayer () {
        this.sections[this.currentSection].layers.push (new layer (100, 100, 1))
        this.calculateI ()
        this.lastLayer ()
        makeCrossSection (this, document.getElementById ("csd"))
    }
    nextLayer () {
        this.currentLayer += 1
        if (this.currentLayer >= this.sections[this.currentSection].layers.length) {
            this.currentLayer = 0
        }
        updateSetting (this)
    }
    lastLayer () {
        this.currentLayer = this.sections[this.currentSection].layers.length - 1
        updateSetting (this)
    }
    prevLayer () {
        this.currentLayer -= 1
        if (this.currentLayer < 0) {
            this.currentLayer = this.sections[this.currentSection].layers.length - 1
        }
        updateSetting (this)
    }
    
    calculateQ () {
        this.QandB = []
        //this.Q = 0
        let shiftedPiecewise = ""
        let c = 0
        for (let i = 0; i < this.currentCrossSection.length; i++) {
            shiftedPiecewise = this.currentCrossSection[i].fn.replaceAll ("x", "(x+" + this.centroid + ")")
            let indefInt = nerdamer.integrate ("-x*(" + this.currentCrossSection[i].fn + ")").text()
            
            let ub = this.currentCrossSection[i].range[1]-this.centroid
            let lb = this.currentCrossSection[i].range[0]-this.centroid

            let upperArea = indefInt.replaceAll ("x", "(" + (this.currentCrossSection[i].range[1]-this.centroid) + ")")
            let lowerArea = indefInt.replaceAll ("x", "(" + (this.currentCrossSection[i].range[0]-this.centroid) + ")")
            //this.I += nerdamer.defint ("x*x*(" + shiftedPiecewise + ")", this.currentCrossSection[i].range[0]-this.centroid, this.currentCrossSection[i].range[1]-this.centroid).text()/1
            c = c-math.evaluate(lowerArea)
            //this.Q += nerdamer(ub).evaluate().text() - nerdamer(lb).evaluate().text()
            //this.QandB.push ({Q: "(" + indefInt + ") +" + c, b: shiftedPiecewise, range: [lb, ub]})
            this.QandB.push ({Q: "(" + indefInt + ") +" + c, b: shiftedPiecewise, range: [lb, ub], bIoverQ: "(("+shiftedPiecewise+")*(" + this.I + "))" + "/((" + indefInt + ") +" + c + ")"})
            c = math.evaluate(upperArea)/1 + c/1
        }
    }

    calculateCentroid (){
        this.centroid = 0
        let top = 0
        let bottom = 0
        for (let i = 0; i < this.currentCrossSection.length; i++) {
            let topindef = nerdamer.integrate ("x*(" + this.currentCrossSection[i].fn + ")").text()
            //top += nerdamer.defint ("x*(" + this.currentCrossSection[i].fn + ")", this.currentCrossSection[i].range[0], this.currentCrossSection[i].range[1]).text()/1
            top += math.evaluate(topindef.replaceAll ("x", this.currentCrossSection[i].range[1])) - math.evaluate(topindef.replaceAll ("x", this.currentCrossSection[i].range[0])) 
            let bottomindev = nerdamer.integrate (this.currentCrossSection[i].fn).text()
            //bottom += nerdamer.defint (this.currentCrossSection[i].fn, this.currentCrossSection[i].range[0], this.currentCrossSection[i].range[1]).text()/1
            bottom += math.evaluate(bottomindev.replaceAll ("x", this.currentCrossSection[i].range[1])) - math.evaluate(bottomindev.replaceAll ("x", this.currentCrossSection[i].range[0])) 
        }
        this.centroid = top/bottom
    }
    calculateI (){
        this.I = 0
        let shiftedPiecewise = ""
        for (let i = 0; i < this.currentCrossSection.length; i++) {
            shiftedPiecewise = this.currentCrossSection[i].fn.replaceAll ("x", "(x+" + this.centroid + ")")
            let indefInt = nerdamer.integrate ("x*x*(" + shiftedPiecewise + ")").text()
            let ub = indefInt.replaceAll ("x", "(" + (this.currentCrossSection[i].range[1]-this.centroid) + ")")
            let lb = indefInt.replaceAll ("x", "(" + (this.currentCrossSection[i].range[0]-this.centroid) + ")")
            //this.I += nerdamer.defint ("x*x*(" + shiftedPiecewise + ")", this.currentCrossSection[i].range[0]-this.centroid, this.currentCrossSection[i].range[1]-this.centroid).text()/1
            this.I += math.evaluate (ub)/1 - math.evaluate (lb)/1
            //nerdamer(math.simplify(ub).toString()).evaluate().text() - nerdamer(math.simplify(lb).toString()).evaluate().text()
        }
    }
    calculateCrossSection () {
        let specifiedTarget = this.sections[this.currentSection].layers
        this.currentCrossSection = []
        let startX = 0
        
        for (let i = 0; i < specifiedTarget.length; i++) {
            let endVal = math.evaluate((specifiedTarget[i].H.toString()).replaceAll ("x", this.currentLength))/1 + startX/1
            //endVal = endVal.evaluate().text()/1 + startX/1
            let fToGraph = specifiedTarget[i].wdH.toString().replaceAll ("x", "(x/" + (endVal-startX)+")")
            fToGraph = "(" + fToGraph + ")" + "*(" + specifiedTarget[i].wdL.toString().replaceAll ("x", "("+this.currentLength+")") + ")"
            this.currentCrossSection.push ({fn: fToGraph, range: [startX, endVal],  color: functionPlot.globals.COLORS[0]})
            startX += endVal/1 - startX/1
        }
        this.calculateLength()
        this.calculateCentroid ()
        this.calculateI()
        updateGeoProperty (this)
        //console.log ("cross section updated")
    }
    /*
    calculatePlanSection () {
        this.currentPlanSection = []
        let startX = 0
        for (let i = 0; i < this.sections.length; i++) {
            let currentDepth = 0
            let localStart = 0
            let localEnd = 0
            let layerToGraph = ""
            let layerHeight
            for (let j = 0; j < this.sections[i].layers.length; j++){
                layerHeight = nerdamer(this.sections[i].layers[j].H.toString () + "=" + this.currentDepth)
                layerHeight = layerHeight.solveFor ("x").text()
                if (layerHeight < startX + this.sections[i].L && layerHeight > startX){
                    layerToGraph = this.sections[i].layers[j]
                    break
                }
            }
            if (layerToGraph = ""){
                continue
            }
            fToGraph = ""
            this.currentCrossSection.push ({fn: fToGraph, range: [localStart, localEnd]})
            this.startX += this.sections[i].L
        }

    }
    */
    updateGeometry () {
        let data = document.getElementsByTagName ("input")
        let errorTest
        try {
            errorTest = nerdamer (data.namedItem ("L").value)
            if (data.namedItem ("L").value != "") {
                this.sections[this.currentSection].L = data.namedItem ("L").value
            }
        }
        catch (err) {
            
        }

        try {
            errorTest = nerdamer (data.namedItem ("H").value)
            if (data.namedItem ("H").value != "") {
                this.sections[this.currentSection].layers[this.currentLayer].H = data.namedItem ("H").value
            }
        }
        catch (err) {
            console.log (data.namedItem ("H").value)
        }

        try {
            errorTest = nerdamer (data.namedItem ("wdH").value)
            if (data.namedItem ("wdH").value != "") {
                this.sections[this.currentSection].layers[this.currentLayer].wdH = data.namedItem ("wdH").value
            }
        }
        catch (err) {

        }

        try {
            errorTest = nerdamer (data.namedItem ("wdL").value)
            if (data.namedItem ("wdL").value != "") {
                this.sections[this.currentSection].layers[this.currentLayer].wdL = data.namedItem ("wdL").value
            }
        }
        catch (err) {

        }

        try {
            errorTest = nerdamer (data.namedItem ("LCurrent").value)
            if (data.namedItem ("LCurrent").value != "") {
                this.currentLength = data.namedItem ("LCurrent").value
            }
        }
        catch (err) {
            console.log (data.namedItem ("LCurrent").value)
        }

        this.calculateCrossSection ()
        //updateSetting (this)
    }
    
    
    
    addLoad (load) {
        this.loads.push (load)
        this.loads[this.loads.length-1].index = this.loads.length+1 //plus 1 because the actual thing has 2 reaction forces on it
        drawLoad (this, load, document.getElementsByClassName("loads")[0])
    }

    modifyLoad (i, x, mag) {
        this.loads[i].x = x
        this.loads[i].mag = mag
    }
    
    getLoad (index){
        for (let i = 0; i < this.loads.length; i++){
            if (this.loads[i].index == index){
                return this.loads[i]
            }
        }
    }
    removeLoad (index) {

    }
    addUniformLoad (load){
        this.uniformLoads.push (load)
    }
    addLoadSet (loadSet) {
        this.loadSets.push (loadSet)
        this.loadSets[this.loadSets.length-1].index = this.loadSets.length-1
        drawLoadSet (this, loadSet, document.getElementsByClassName("loadSets")[0])
    }
    moveLoadSet (i, x) {
        this.loadSets[i].updatePosition (x)
        //this.loadSets[i].x = x
    }
    modifyLoadSet (i, mag) {
        this.loadSets[i].mags = []
        for (let j = 0; j < mag.length; j++) {
            this.loadSets[i].mags.push(mag[j]/1)
        }
        
        this.loadSets[i].updateLoads()
    }
    resetLoads (){
        this.loads = []
    }
    getEffectiveLoads () {
        let effectiveLoads = []
        for (let i = 0; i < this.loads.length; i++) {
            if (this.loads[i].x > 0 && this.loads[i].x < this.L){
                effectiveLoads.push (this.loads[i])
            }
        }
        for (let i = 0; i < this.loadSets.length; i++) {
            effectiveLoads = effectiveLoads.concat (this.loadSets[i].getLoads())
        }
        for (let i = effectiveLoads.length-1; i >= 0; i--) {
            if (effectiveLoads[i].x < 0 || effectiveLoads[i].x > this.L){
                effectiveLoads.splice (i,1)
            }
        }
        return (effectiveLoads)
    }

    calculateSupport (){
        //sum of the monent at A
        let effectiveLoads = this.getEffectiveLoads()
        
        var momentAtA = 0 
        for (let i = 0; i < effectiveLoads.length; i++){
            momentAtA += effectiveLoads[i].x*effectiveLoads[i].mag // adds the moment caused by each point load
        }

        for (let i = 0; i < this.uniformLoads.length; i++) {// adds the moment caused by each uniform load
            let indefInt = nerdamer.integrate ("x*(" + this.uniformLoads[i].mag.text() + ")")
            momentAtA += math.evaluate (indefInt.replaceAll ("x", "(" + this.uniformLoads[i].end + ")")) - math.evaluate (indefInt.replaceAll ("x", "(" + this.uniformLoads[i].start + ")"))
            //momentAtA += nerdamer.defint ("x*(" + this.uniformLoads[i].mag.text() + ")", this.uniformLoads[i].start, this.uniformLoads[i].end).text()/1
            
        }
        
        this.supportB = momentAtA/this.L //support forces at point B is the moment from applied loads divided by the distance from A to B
        
        //sum of the forces in Y
        var totalLoad = 0 
        for (let i = 0; i < effectiveLoads.length; i++){// adds the loads caused by each point load to totalLoad
            totalLoad += effectiveLoads[i].mag 
        }
        for (let i = 0; i < this.uniformLoads.length; i++) {// adds the loads caused by each uniform load to totalLoad
            let indefInt = nerdamer.integrate (this.uniformLoads[i].mag.text())
            totalLoad += math.evaluate (this.uniformLoads[i].mag.text().replaceAll ("x", "(" + this.uniformLoads[i].end + ")")) - math.evaluate (this.uniformLoads[i].mag.text().replaceAll ("x", "(" + this.uniformLoads[i].start + ")"))
            //totalLoad += nerdamer.defint (this.uniformLoads[i].mag.text(), this.uniformLoads[i].start, this.uniformLoads[i].end).text()/1 
        }
        this.supportA = totalLoad - this.supportB //using sum of forces in Y to get support forces at A

        updateSupports (this)
    }

    calculateSFD () {
        this.SFD = []

        //var g = graph.jc.snippet("x^3", true, 'x', true)
    
        //sortedForces = [{mag: -data.supportA, x:0}, data.loads[0], data.loads[1], {mag: -data.supportB, x:data.L}]
        let unsortedForces = this.getEffectiveLoads ()
        let sortedForces = [{mag: -this.supportA, x:0}]
        for (let i = 0; i < unsortedForces.length; i++){
            for (let j = 0; j < sortedForces.length; j++){
                if (unsortedForces[i].x < sortedForces[j].x){
                    sortedForces.splice (j, 0, unsortedForces[i])
                    break
                }
                if (j == sortedForces.length-1){
                    sortedForces.push (unsortedForces[i])
                    break
                }
            }
        }
        sortedForces.push({mag: -this.supportB, x:this.L})
    
        let startY = 0
        for (let i = 0; i < sortedForces.length; i++){
            startY += -sortedForces[i].mag
            let fToGraph = ""
            fToGraph += String (startY)
            for (let j = 0; j < this.uniformLoads.length; j++){
                fToGraph += "-" + nerdamer.integrate (this.uniformLoads[j].mag.text()).text()
            }
            if (i == sortedForces.length - 1){
                //graph.create('functiongraph', [fToGraph,sortedForces[i].x,L])
            } else {
                this.SFD.push ({fn: fToGraph, range: [sortedForces[i].x, sortedForces[i+1].x], color: functionPlot.globals.COLORS[0]})
                //graph.create('functiongraph', [fToGraph, sortedForces[i].x, sortedForces[i+1].x])
            }
        }
        //functionPlot (SFD)
        return (this.SFD)
    }

    calculateBMD () {
        this.BMD = []
        //var g = graph.jc.snippet("x^3", true, 'x', true)
        let unsortedForces = this.getEffectiveLoads ()
        let sortedForces = [{mag: -this.supportA, x:0}]
        for (let i = 0; i < unsortedForces.length; i++){
            for (let j = 0; j < sortedForces.length; j++){
                if (unsortedForces[i].x < sortedForces[j].x){
                    sortedForces.splice (j, 0, unsortedForces[i])
                    break
                }
                if (j == sortedForces.length-1){
                    sortedForces.push (unsortedForces[i])
                    break
                }
            }
        }
        sortedForces.push({mag: -this.supportB, x:this.L})
        //sortedForces = [{mag: -data.supportA, x:0}, data.loads[0], data.loads[1], {mag: -data.supportB, x:data.L}]
        
        let startY = 0
        let c = 0
        for (let i = 0; i < sortedForces.length; i++){
            startY += -sortedForces[i].mag
            let fToGraph = ""
            fToGraph += String (startY)
            for (let j = 0; j < this.uniformLoads.length; j++){
                fToGraph += "-" + nerdamer.integrate (this.uniformLoads[j].mag.text()).text()
            }
            
            //fToGraph = nerdamer(fToGraph).sub('x', "(x+" + sortedForces[i].x + ")");
            fToGraph = fToGraph.replaceAll("x", "(x+" + sortedForces[i].x + ")")
            fToGraph = nerdamer.integrate (fToGraph).text() + "+" + c
    
            //console.log (fToGraph)
            if (i == sortedForces.length - 1){
                //graph.create('functiongraph', [fToGraph,sortedForces[i].x,L])
            } else {
                let cCalculator = fToGraph.replaceAll ("x", sortedForces[i+1].x-sortedForces[i].x)
                //c = nerdamer(cCalculator).evaluate().text() 
                c = math.evaluate (cCalculator)/1
                fToGraph = fToGraph.replaceAll("x", "(x-" + sortedForces[i].x + ")")
                this.BMD.push ({fn: fToGraph, range: [sortedForces[i].x, sortedForces[i+1].x], color: functionPlot.globals.COLORS[0]})
            }
            //functionPlot (BMD)
        }
    
        //get chat gpt to write a sorting thing
    
        //sortedForces = [data.loads[0]]
    
        //graph.create ('curve',[function (x){return (x*x)}, 0, 500])
        //graph.create('functiongraph', [data.uniformLoads[0].mag.text(),0,1000]);
        //BMD.yAxis = {domain: [-1000, 100000], label: "Internal Bending Moment"}
        return (this.BMD)
    }

    calculateMomentStress () {
        this.momentStress = []
        //MY/I
        let M = this.getMaxMoment (this.calculationLocation)
        this.calculateCrossSection()
        this.calculateThickness()
        this.momentStress = [{fn: "(" + M[1] + ")*x/" + this.I, range: [-this.centroid, this.currentThickness-this.centroid]}]
        //console.log ([{fn: M[1] + "(x+ " +this.centroid  + ")/" + this.I, range: [this.centroid-this.currentThickness, this.currentThickness-this.centroid]}])
    }

    calculateShearStress () {
        this.shearStress = []
        //MY/I
        let v = this.getMaxShear (this.calculationLocation)
        this.calculateCrossSection()
        //this.calculateThickness()
        this.calculateQ ()
        //Qv/Ib
        for (let i = 0; i < this.QandB.length; i++) {
            this.shearStress.push({fn: "((" + Math.abs(v[1]) + ")*(" +this.QandB[i].Q+ "))/(" + this.I + "*" +this.QandB[i].b + ")", range: this.QandB[i].range, color: functionPlot.globals.COLORS[0]})
            //this.shearStress.push({fn: this.QandB[i].Q, range: this.QandB[i].range})
        }
        //console.log ([{fn: M[1] + "(x+ " +this.centroid  + ")/" + this.I, range: [this.centroid-this.currentThickness, this.currentThickness-this.centroid]}])
        //console.log (this.shearStress)
    }

    calculateStresses () {
        this.calculateMomentStress()
        this.calculateShearStress ()
        drawStress (this)
    }

    translateCalcLoc () {
        let currentSectionStart = 0
        for (let i = 0; i < this.sections.length; i++) {
            if (currentSectionStart < this.calculationLocation && this.calculationLocation < currentSectionStart + this.sections[i].L/1) {
                this.currentSection = i
                this.currentLength = this.calculationLocation - currentSectionStart
            }
            currentSectionStart += this.sections[i].L/1
        }
        updateSetting (this)
    }
    getMaxMoment (pos) {
        for (let i = 0; i < this.BMDEnvalope.length; i++){
            if (this.BMDEnvalope[i][0] == pos){
                return (this.BMDEnvalope[i])
            }
        }
    }
    getMaxShear (pos) {
        for (let i = 0; i < this.SFDEnvalope.length; i++){
            if (this.SFDEnvalope[i][0] == pos){
                return (this.SFDEnvalope[i])
            }
        }
    }

    fastLoadsetEnvalope (loadSet) {
        let interval = this.interval
        this.SFDEnvalope = []
        this.BMDEnvalope = []
        var evaluationCords = []
        for (let i = interval; i < this.L; i += interval) {
            evaluationCords.push (i)
            this.SFDEnvalope.push ([i, 0])
            this.BMDEnvalope.push ([i, 0])
        }
        var possiblePositions = []
        for (let i = interval; i < this.L + loadSet.size; i += interval) {
            possiblePositions.push (i)
        }
        //        for (let i = 0; i < possiblePositions.length; i++) {
         let maxMomentLocation = [0,0]
        for (let i = 0; i < possiblePositions.length; i++){
            console.log (i/possiblePositions.length)       
            loadSet.updatePosition (possiblePositions[i])
            this.calculateSupport ()
            let currentSFD = this.calculateSFD()
            let currentBMD = this.calculateBMD()
            
            for (let j = 0; j < evaluationCords.length; j++) {
                let shear = evaluatePiecewise (currentSFD, evaluationCords[j])
                let moment = evaluatePiecewise (currentBMD, evaluationCords[j])
                if (Math.abs(this.SFDEnvalope[j][1]) < Math.abs(shear)){
                    this.SFDEnvalope[j] = [evaluationCords[j], shear]
                }
                if (Math.abs(this.BMDEnvalope[j][1]) < Math.abs(moment)){
                    this.BMDEnvalope[j] = [evaluationCords[j], moment]
                }
            }
            //let thisMaxMoment = getFunctionMax (currentBMD)
            //if (maxMomentLocation[1] < thisMaxMoment) {
            //    maxMomentLocation = [possiblePositions[i], thisMaxMoment]
            //}
            //console.log (maxMomentLocation)

        }
        localStorage.setItem ("sfdEnvalope", JSON.stringify(this.SFDEnvalope))
        localStorage.setItem ("bmdEnvalope", JSON.stringify(this.BMDEnvalope))

        //console.log (this.SFDEnvalope)
        //console.log (this.BMDEnvalope)
        makeGraphs (this)
        document.getElementsByClassName("loadSet")[loadSet.index].style.setProperty ("left", ((6+88*(loadSet.x/this.L))-(88*loadSet.size/this.L)) + "%")
    }
    makeLoadsetEnvalope (loadSet) {
        let interval = this.interval
        this.SFDEnvalope = []
        this.BMDEnvalope = []
        var evaluationCords = []
        for (let i = interval; i < this.L; i += interval) {
            evaluationCords.push (i)
            this.SFDEnvalope.push ([i, 0])
            this.BMDEnvalope.push ([i, 0])
        }
        var possiblePositions = []
        for (let i = interval; i < this.L + loadSet.size; i += interval) {
            possiblePositions.push (i)
        }

        //        for (let i = 0; i < possiblePositions.length; i++) {
        var simulateThrough = function (self, iteration) {
            
            loadSet.updatePosition (possiblePositions[iteration])
            self.calculateSupport ()
            let currentSFD = self.calculateSFD()
            let currentBMD = self.calculateBMD()
            
            document.getElementsByClassName("loadSet")[loadSet.index].style.setProperty ("left", ((6+88*(loadSet.x/self.L))-(88*loadSet.size/self.L)) + "%")
            for (let j = 0; j < evaluationCords.length; j++) {
                let shear = evaluatePiecewise (currentSFD, evaluationCords[j])
                let moment = evaluatePiecewise (currentBMD, evaluationCords[j])
                if (Math.abs(self.SFDEnvalope[j][1]) < Math.abs(shear)){
                    self.SFDEnvalope[j] = [evaluationCords[j], shear]
                }
                if (Math.abs(self.BMDEnvalope[j][1]) < Math.abs(moment)){
                    self.BMDEnvalope[j] = [evaluationCords[j], moment]
                }
            }
            makeGraphs (self)
            drawEnvalopes (self.SFDEnvalope, self.BMDEnvalope)
            if (iteration+1 < possiblePositions.length) {
                setTimeout (function (){simulateThrough(self, iteration+1)}, 25)
            } else {
                console.log (self.SFDEnvalope)
                console.log (self.BMDEnvalope)
            }
        }
        simulateThrough (this, 0)

        
    }


    updateGraphs () {
        this.calculateSupport ()
        this.calculateSFD ()
        this.calculateBMD ()
        makeGraphs (this)
    }

    getBreakingPoints () {
        this.compressionLimit = []
        this.tensionLimit = []
        this.shearGlueLimit = []
        this.shearLimit = []
        this.glueLocation = []
        this.maxMomentCapacity = 0

        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            this.calculateCentroid ()
            this.calculateI ()
            this.calculateThickness ()
            this.calculateQ ()
            this.compressionLimit.push ([i, Math.abs(math.evaluate((6*this.I) + "/(" + (this.centroid-this.currentThickness) + ")"))])
            this.tensionLimit.push ([i, Math.abs(math.evaluate((30*this.I) + "/(" + (this.centroid) + ")"))])
            let shearForceLimit = []
            for (let  j = 0; j < this.QandB.length; j++) {
                shearForceLimit.push ({fn: "2" + "*(" + this.QandB[j].bIoverQ + ")", range: this.QandB[j].range})
            }
            this.shearLimit.push ([i, getFunctionMin (shearForceLimit)])
        }

        for (let i = 0; i < this.compressionLimit.length; i++) {
            let candicate = 0
            if (this.compressionLimit[i][1] > this.tensionLimit[i][1]){
                candidate = this.compressionLimit[i][1]
            } else {
                candicate = this.tensionLimit[i][1]
            }
            if (this.maxMomentCapacity < candicate) {
                this.maxMomentCapacity = candicate
            }
        }
        
        //this.largest
    }

    getGlueFOS (glueLoc) {
        let actualGlueLoc = JSON.parse ("[" + glueLoc + "]")
        this.glueLimit = []
        this.maxGlueCapacity = 0
        let positiveGlue = []

        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            this.calculateCrossSection()
            this.calculateThickness ()
            this.calculateQ ()

            let gluePos = []

            for (let j = 0; j < actualGlueLoc[this.currentSection].length; j++){
                gluePos.push (this.QandB[actualGlueLoc[this.currentSection][j]].range[1])
            }
            let glueLimitEqs = []
            for (let  j = 0; j < this.QandB.length; j++) {
                glueLimitEqs.push ({fn: "2" + "*(" + this.QandB[j].bIoverQ + ")", range: this.QandB[j].range})
            }
            let currentGlueValue = []

            for (let j = 0; j < gluePos.length; j++){
                currentGlueValue.push (Math.abs(pieceWiseL (glueLimitEqs, gluePos[j])))
                currentGlueValue.push (Math.abs(pieceWiseR (glueLimitEqs, gluePos[j])))
            }

            this.glueLimit.push ([i,Math.min (...currentGlueValue)])
            positiveGlue.push ([i,Math.min (...currentGlueValue)])
            this.glueLimit.push ([i, -Math.min (...currentGlueValue)])
        }

        for (let i = 0; i < this.glueLimit.length; i++) {
            let candicate = 0
            if (this.glueLimit[i][1] > this.glueLimit[i][1]){
                candidate = this.glueLimit[i][1]
            } else {
                candicate = this.glueLimit[i][1]
            }
            if (this.maxGlueCapacity < candicate) {
                this.maxGlueCapacity = candicate
            }
        }
        let FOS = 9999999


        for (let i = 0; i < positiveGlue.length; i++) {
            let currentFOS = Math.abs(positiveGlue[i][1]/this.SFDEnvalope[i][1])
            if (currentFOS < FOS) {
                FOS = currentFOS
            }
        }

        return (FOS)
    }

    getShearFOS () {
        this.shearLimit = []
        this.maxShearCapacity = 0
        let positiveShears = []
        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            this.calculateCrossSection()
            this.calculateThickness ()
            this.calculateQ ()
            let shearForceLimit = []
            for (let  j = 0; j < this.QandB.length; j++) {
                shearForceLimit.push ({fn: "4" + "*(" + this.QandB[j].bIoverQ + ")", range: this.QandB[j].range})
            }
            let actualShearForceLimit = getFunctionMin (shearForceLimit)
            this.shearLimit.push ([i, actualShearForceLimit])
            this.shearLimit.push ([i, -actualShearForceLimit])
            positiveShears.push ([i, actualShearForceLimit])
        }

        for (let i = 0; i < this.shearLimit.length; i++) {
            let candicate = 0
            if (this.shearLimit[i][1] > this.shearLimit[i][1]){
                candidate = this.shearLimit[i][1]
            } else {
                candicate = this.shearLimit[i][1]
            }
            if (this.maxShearCapacity < candicate) {
                this.maxShearCapacity = candicate
            }
        }
        let FOS = 9999999

        for (let i = 0; i < positiveShears.length; i++) {
            let currentFOS = Math.abs(positiveShears[i][1]/this.SFDEnvalope[i][1])
            if (currentFOS < FOS) {
                FOS = currentFOS
            }
        }

        return (FOS)
    }

    getMomentFOS () {
        this.compressionLimit = []
        this.tensionLimit = []
        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            this.calculateCrossSection()
            this.calculateThickness ()
            this.compressionLimit.push ([i, Math.abs(math.evaluate((6*this.I) + "/(" + (this.centroid) + ")"))])
            this.tensionLimit.push ([i, Math.abs(math.evaluate((30*this.I) + "/(" + (this.centroid-this.currentThickness) + ")"))])
        }

        for (let i = 0; i < this.compressionLimit.length; i++) {
            let candicate = 0
            if (this.compressionLimit[i][1] > this.tensionLimit[i][1]){
                candidate = this.compressionLimit[i][1]
            } else {
                candicate = this.tensionLimit[i][1]
            }
            if (this.maxMomentCapacity < candicate) {
                this.maxMomentCapacity = candicate
            }
        }

        let FOSTension = 9999999

        for (let i = 0; i < this.tensionLimit.length; i++) {
            let currentFOS = Math.abs(this.tensionLimit[i][1]/this.BMDEnvalope[i][1])
            if (currentFOS < FOSTension) {
                FOSTension = currentFOS
            }
        }

        let FOSCompression = 9999999

        for (let i = 0; i < this.compressionLimit.length; i++) {
            let currentFOS = Math.abs(this.compressionLimit[i][1]/this.BMDEnvalope[i][1])
            if (currentFOS < FOSCompression) {
                FOSCompression = currentFOS
            }
        }

        return ([FOSTension, FOSCompression])
        
    }

    getBucklingMomentFOS (section, layer, k, t, b) {
        let crit = []
        this.currentSection = section
        this.currentLayer = layer
        let critForce = []

        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            if (this.currentSection != section){
                continue
            }
            this.calculateCrossSection()
            this.calculateThickness ()
            //(k*pi*E/(12(1-mu^2))) * (t/b)
            let currentB = math.evaluate (b.replaceAll("x", "(" + this.currentLength + ")"))/1
            let currentT = math.evaluate (t.replaceAll("x", "(" + this.currentLength + ")"))/1
            //make it so that b, t can be an expression of x where x is the distance from the start
            crit.push ([i, (currentT/currentB)*(currentT/currentB)*(k*Math.PI*Math.PI*4000)/(12*(1-0.2*0.2))])
            let maxY = this.currentCrossSection[layer].range[1]-this.centroid
            let minY = this.currentCrossSection[layer].range[0]-this.centroid
            if (maxY > 0){
                maxY = 0
            }
            if (minY > 0) {
                minY = 0
            }
            let currentCritForce = Math.min (Math.abs(math.evaluate((crit[crit.length-1][1]*this.I) + "/(" + (maxY) + ")")), Math.abs(math.evaluate((crit[crit.length-1][1]*this.I) + "/(" + (minY) + ")")))
            critForce.push ([i, currentCritForce])
        }

        let FOS = 9999999

        for (let i = 0; i < critForce.length; i++) {
            let newFOS = Math.abs(critForce[i][1]/this.BMDEnvalope[critForce[i][0]][1])
            if (newFOS < FOS) {
                FOS = newFOS
            }
        }
        return ([critForce, FOS])
    }

    getBucklingShearFOS (section, layer, t, b, a){
        let crit = []
        this.currentSection = section
        this.currentLayer = layer
        let critForce = []
        let positiveCritForce = []

        for (let i = this.interval; i < this.L - this.interval; i += this.interval) {
            this.calculationLocation = i
            this.translateCalcLoc ()
            if (this.currentSection != section){
                continue
            }
            this.calculateCrossSection()
            this.calculateThickness ()
            this.calculateQ()
            //(k*pi*E/(12(1-mu^2))) * (t/b)
            let currentB = math.evaluate (b.replaceAll("x", "(" + this.currentLength + ")"))/1
            let currentT = math.evaluate (t.replaceAll("x", "(" + this.currentLength + ")"))/1
            //make it so that b, t can be an expression of x where x is the distance from the start
            crit.push ([i, (currentT/currentB)*(currentT/currentB)*(5*Math.PI*Math.PI*4000)/(12*(1-0.2*0.2))])
            let shearForceLimit = []
            for (let  j = 0; j < this.QandB.length; j++) {
                shearForceLimit.push ({fn: crit[crit.length-1][1] + "*(" + this.QandB[j].bIoverQ + ")", range: this.QandB[j].range})
            }
            let actualShearForceLimit = getFunctionMin (shearForceLimit)

            //let currentCritForce = Math.min (Math.abs(math.evaluate((crit[crit.length-1][1]*this.I) + "/(" + (maxY) + ")")), Math.abs(math.evaluate((crit[crit.length-1][1]*this.I) + "/(" + (minY) + ")")))
            critForce.push ([i, actualShearForceLimit])
            positiveCritForce.push ([i, actualShearForceLimit])
            critForce.push ([i, -actualShearForceLimit])
        }
        let FOS = 9999999

        for (let i = 0; i < positiveCritForce.length; i++) {
            let currentFOS = Math.abs(positiveCritForce[i][1]/this.SFDEnvalope[positiveCritForce[i][0]][1])
            if (currentFOS < FOS) {
                FOS = currentFOS
            }
        }
        return ([critForce, FOS])
    }

}

function getFunctionMin (fn){
    let potentialMaxes = []
    for (let i = 0; i < fn.length; i++) {
        let derivative = nerdamer.diff(fn[i].fn).text()
            derivative = math.simplify (derivative).toString()
            let critPoints = []

            try {
                critPoints = JSON.parse (nerdamer.solve (derivative + "=0", "x").toString ())
            }
            catch (err){
                //let zeros = []
            }

            critPoints.push (fn[i].range[1])
            critPoints.push (fn[i].range[0])

            for (let j = 0; j < critPoints.length; j++) {
                //potentialMaxes.push (math.evaluate (fn.fn.replaceAll ("x", "(" + critPoints[j] + ")"))/1)
                if (critPoints[j] >= fn[i].range[0] &&critPoints[j] <= fn[i].range[1]){
                    potentialMaxes.push (Math.abs(math.evaluate (fn[i].fn.replaceAll("x", "(" + critPoints[j] + ")"))))
                }
            }
    }

    return (Math.min(...potentialMaxes))
}

function getFunctionMax (fn) {
    let potentialMaxes = []
        for (let i = 0; i < fn.length; i++) {
            let derivative = nerdamer.diff(fn[i].fn).text()
                derivative = math.simplify (derivative).toString()
                let critPoints = []

                try {
                    critPoints = JSON.parse (nerdamer.solve (derivative + "=0", "x").toString ())
                }
                catch (err){
                    //let zeros = []
                }

                critPoints.push (fn[i].range[1])
                critPoints.push (fn[i].range[0])

                for (let j = 0; j < critPoints.length; j++) {
                    //potentialMaxes.push (math.evaluate (fn.fn.replaceAll ("x", "(" + critPoints[j] + ")"))/1)
                    if (critPoints[j] >= fn[i].range[0] &&critPoints[j] <= fn[i].range[1]){
                        potentialMaxes.push (Math.abs(math.evaluate (fn[i].fn.replaceAll("x", "(" + critPoints[j] + ")"))))
                    }
                }
        }

        return (Math.max(...potentialMaxes))
}
/*
const target = document.getElementById("sfdEnvalope")
target.innerHTML = ""
var shearEnvalopeGraph = new Chart (target,{
    type: 'scatter',
    data: {
        datasets: [{
            label: "Max Shear Force",
            data: [{x: 10, y: 20}, {x: 15, y: 100}, {x: 200, y: 15}]
        }]
    },
    options: {
        scales: {
            x: {
                suggestedMin: -10,
                suggestedMax: 1210
            },
            y: {
                suggestedMin: -500,
                suggestedMax: 500
            }
        }
    }
})
*/

function drawEnvalopes (shearEnvalope, momentEnvalope) {
    /*
    const target = document.getElementById("sfdEnvalope")
    target.innerHTML = ""
    shearEnvalopeGraph.data.datasets[0].data = []

    let formattedData = []
    for (let i = 0; i < shearEnvalope.length; i++) {
        formattedData.push ({x: shearEnvalope[i][0], y: shearEnvalope[i][1]})
        shearEnvalopeGraph.data.datasets[0].data.push(formattedData[i]);
    }
    
    shearEnvalopeGraph.update('none');
    */
}

function evaluatePiecewise (fn, x) {
    for (let i = 0; i < fn.length; i++) {
        if (x >= fn[i].range[0] && x <= fn[i].range[1]) {
            let subedIn = fn[i].fn.replaceAll ("x", "(" + x + ")")
            //return (nerdamer(subedIn).evaluate().text()/1)
            return (math.evaluate(subedIn)/1)
        }
    }
    return (NaN)
}

function pieceWiseR (fn, x) {
    for (let i = 0; i < fn.length; i++) {
        if (x >= fn[i].range[0] && x < fn[i].range[1]) {
            let subedIn = fn[i].fn.replaceAll ("x", "(" + x + ")")
            //return (nerdamer(subedIn).evaluate().text()/1)
            return (math.evaluate(subedIn)/1)
        }
    }
    return (NaN)
}

function pieceWiseL (fn, x) {
    for (let i = 0; i < fn.length; i++) {
        if (x > fn[i].range[0] && x <= fn[i].range[1]) {
            let subedIn = fn[i].fn.replaceAll ("x", "(" + x + ")")
            //return (nerdamer(subedIn).evaluate().text()/1)
            return (math.evaluate(subedIn)/1)
        }
    }
    return (NaN)
}


//functionality to toggle whether the magnatude of the force is always seen or not
document.getElementsByClassName("reaction")[0].style.setProperty ("--showMag", 1)
document.getElementsByClassName("reaction")[0].addEventListener ("dblclick", function (e){
    if (this.style.getPropertyValue ("--showMag") == 0){
        this.style.setProperty("--showMag", 1)
    } else {
        this.style.setProperty("--showMag", 0)
    }
    
})

document.getElementsByClassName("reaction")[1].style.setProperty ("--showMag", 1)
document.getElementsByClassName("reaction")[1].addEventListener ("dblclick", function (e){
    if (this.style.getPropertyValue ("--showMag") == 0){
        this.style.setProperty("--showMag", 1)
    } else {
        this.style.setProperty("--showMag", 0)
    }
    
})

entryFields = document.getElementsByClassName ("entry")



simulation = new bridge ()


/*
simulation.addLoad (new pointLoad(172, 200/3))
simulation.addLoad (new pointLoad(348, 200/3))
simulation.addLoad (new pointLoad(512, 200/3))
simulation.addLoad (new pointLoad(688, 200/3))
simulation.addLoad (new pointLoad(852, 90))
simulation.addLoad (new pointLoad(1028, 90))
*/
//simulation.addUniformLoad (new uniformLoad (0, 1000, "0.01*x"))
var loadCaseTwo = new loadSet ()

loadCaseTwo.mags = [200/3, 200/3, 200/3, 200/3, 90, 90]
loadCaseTwo.spacing = [176, 164]
loadCaseTwo.updateLoads ()
simulation.addLoadSet (loadCaseTwo)

try {
    if (simulation.SFDEnvalope.length == 0) {
        simulation.fastLoadsetEnvalope(simulation.loadSets[0])
    }
} catch (err) {
    simulation.fastLoadsetEnvalope(simulation.loadSets[0])
}


var loadCaseOne = new loadSet ()
loadCaseOne.mags = [200/3, 200/3, 200/3, 200/3, 200/3, 200/3]
loadCaseOne.spacing = [176, 164]
loadCaseOne.updateLoads ()
//simulation.addLoadSet (loadCaseOne)
//simulation.getBreakingPoints()
//simulation.addLoad (new pointLoad(500, 90))

simulation.updateGraphs ()
makeCrossSection (simulation, document.getElementById ("csd"))
updateSetting (simulation)
settingsButtons = document.getElementsByClassName ("swapButton")

settingsButtons.namedItem ("addLayer").addEventListener ("click", function (e) {
    simulation.addLayer ()
})

settingsButtons.namedItem ("nextLayer").addEventListener ("click", function (e) {
    simulation.nextLayer ()
})

settingsButtons.namedItem ("prevLayer").addEventListener ("click", function (e) {
    simulation.prevLayer ()
})


settingsButtons.namedItem ("addSection").addEventListener ("click", function (e) {
    simulation.addSection ()
})

settingsButtons.namedItem ("nextSection").addEventListener ("click", function (e) {
    simulation.nextSection ()
})

settingsButtons.namedItem ("prevSection").addEventListener ("click", function (e) {
    simulation.prevSection ()
})




for (let i = 0; i < entryFields.length; i++) {
    entryFields[i].style.width = entryFields[i].value.length + "ch";
    entryFields[i].addEventListener ("input", function (e) {
        this.style.width = this.value.length + "ch";
        simulation.updateGeometry()
        makeCrossSection (simulation, document.getElementById ("csd"))
    })
}

document.getElementsByClassName ("lengthSelector")[0].setAttribute ("min", 0)
document.getElementsByClassName ("lengthSelector")[0].setAttribute ("max", simulation.sections[simulation.currentSection].L)
document.getElementsByClassName ("lengthSelector")[0].setAttribute ("value", simulation.currentLength)
document.getElementsByClassName ("lengthSelector")[0].previousElementSibling.setAttribute ("value", simulation.currentLength)
document.getElementsByClassName ("lengthSelector")[0].addEventListener ("input", function (e) {
    this.previousElementSibling.style.width = this.value.length + "ch";
    simulation.updateGeometry()
    makeCrossSection (simulation, document.getElementById ("csd"))
})

document.getElementsByClassName ("lengthSelector")[1].setAttribute ("min", simulation.interval)
document.getElementsByClassName ("lengthSelector")[1].setAttribute ("max", simulation.L- simulation.interval)
document.getElementsByClassName ("lengthSelector")[1].setAttribute ("step", simulation.interval)
document.getElementsByClassName ("lengthSelector")[1].setAttribute ("value", simulation.calculationLocation)
document.getElementsByClassName ("lengthSelector")[1].previousElementSibling.setAttribute ("value", simulation.calculationLocation)
document.getElementsByClassName ("lengthSelector")[1].previousElementSibling.style.width = document.getElementsByClassName ("lengthSelector")[1].value.length + "ch";

document.getElementsByClassName ("lengthSelector")[1].addEventListener ("input", function (e) {
    this.previousElementSibling.style.width = this.value.length + "ch";
    simulation.calculationLocation = this.value
    simulation.translateCalcLoc ()
    drawStress(simulation)
})


function drawLoadSet (data, loadSet, target) {
    let newElement = document.createElement ("div")
    newElement.className = "loadSet"
    newElement.style.setProperty ("width", ((88*loadSet.size/data.L)) + "%")
    newElement.style.setProperty ("left", ((6+88*(loadSet.x/data.L))-(88*loadSet.size/data.L)) + "%")
    let fakeBridge = {L: loadSet.size}
    for (let i = 0; i < loadSet.loads.length; i++) {
        drawLoad (fakeBridge, loadSet.loads[i], newElement, false)
        newElement.lastChild.style.setProperty("left", "")
        newElement.lastChild.style.setProperty("right", ((-100*(loadSet.loads[i].x)/loadSet.size)-((data.L/loadSet.size)/0.88)) + "%")
        newElement.lastChild.style.setProperty("width", (2*(data.L/loadSet.size)/0.88) + "%")
    }
    newElement.style.setProperty ("--mouseOffset", 0)
    newElement.addEventListener("mousedown", function (e){
        if (this.style.getPropertyValue ("--showEditor") == 0) {
            this.className += " dragged"
            this.style.setProperty ("--mouseOffset", e.clientX-this.getBoundingClientRect().x-this.firstChild.getBoundingClientRect().width/2)
        }
        //let leftLimit = document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().width/2
    })
    let indexOfThis = loadSet.index
    
    newElement.addEventListener ("dblclick", function (e) {
        if (this.style.getPropertyValue ("--showEditor") == 0){
            this.style.setProperty("--showEditor", 1)
            this.style.setProperty("--showMag", 0)
            this.lastChild.style.setProperty ("transform", "scale(1)")
            this.lastChild.style.setProperty ("left", "calc(" + (e.clientX - this.getBoundingClientRect().x) + "px" + " - 11ch)")
            this.lastChild.style.setProperty ("opacity", "1")
            this.lastChild.children[0].children[0].value = simulation.loadSets[indexOfThis].mags
            this.lastChild.children[1].children[0].value = simulation.loadSets[indexOfThis].spacing
            this.lastChild.children[2].children[0].value = simulation.loadSets[indexOfThis].x
        } else {
            this.style.setProperty("--showEditor", 0)
            document.activeElement.blur();
            this.lastChild.style.setProperty ("transform", "scale(0)")
            this.lastChild.style.setProperty ("opacity", "0")
            simulation.modifyLoadSet (indexOfThis, this.lastChild.children[0].children[0].value.split(','))
            simulation.loadSets[indexOfThis].changeSpacing (this.lastChild.children[1].children[0].value.split(','))
            drawLoadSet (data, loadSet, target)
            this.remove()
        }
    })
    
    newElement.style.setProperty ("--showEditor", 0)
    newElement.style.setProperty ("--correspondingIndex", loadSet.index)

    let editorDiv = document.createElement ("div")
    let childDivs = [document.createElement ("div"), document.createElement("div"), document.createElement("div")]
    let childInputs = [document.createElement ("input"), document.createElement("input"), document.createElement("input")]
    
    editorDiv.className = "loadSetEditor"
    childInputs[0].className = "miniInput"
    childInputs[0].setAttribute ("type", "text")
    childInputs[0].addEventListener ("input", function () {
        //simulation.modifyLoad (indexOfThis, simulation.loads[indexOfThis].x, this.value)
        //newElement.setAttribute ("mag", Math.round (load.mag) + " N")
        //simulation.updateGraphs ()
    })

    childInputs[1].className = "miniInput"
    childInputs[1].setAttribute ("type", "text")
    childInputs[1].addEventListener ("input", function () {
        //simulation.modifyLoad (indexOfThis, this.value, simulation.loads[indexOfThis].mag)
        //newElement.style.setProperty ("left", (5+88*(this.value/simulation.L)) + "%")
       // simulation.updateGraphs ()
    })

    childInputs[2].className = "miniInput"
    childInputs[2].setAttribute ("type", "number")
    childInputs[2].addEventListener ("input", function () {
        simulation.moveLoadSet (indexOfThis, this.value/1)
        newElement.style.setProperty ("left", ((6+88*(loadSet.x/data.L))-(88*loadSet.size/data.L)) + "%")
        simulation.updateGraphs ()
    })

    childDivs[0].innerHTML = "Magnitudes (N):"
    childDivs[0].appendChild (childInputs[0])

    childDivs[1].innerHTML = "Spacing (mm):"
    childDivs[1].appendChild (childInputs[1])

    childDivs[2].innerHTML = "Location (mm):"
    childDivs[2].appendChild (childInputs[2])


    editorDiv.appendChild (childDivs[0])
    editorDiv.appendChild (childDivs[1])
    editorDiv.appendChild (childDivs[2])
    newElement.appendChild (editorDiv)
    //console.log (newElement)
    target.appendChild (newElement)
}


function drawLoad (data, load, target, draggable) {
    let newElement = document.createElement ("div")
    newElement.className = "load"
    newElement.setAttribute ("mag", Math.round (load.mag) + " N")
    
    //functionality to toggle whether the magnatude of the force is always seen or not
    newElement.addEventListener ("click", function (e){
        if (this.style.getPropertyValue ("--showMag") == 0){
            this.style.setProperty("--showMag", 1)
        } else {
            this.style.setProperty("--showMag", 0)
        }
        
    })

    let indexOfThis = load.index-2

    
    



    if (draggable == undefined || draggable == true) {
        newElement.addEventListener ("dblclick", function () {
            if (this.style.getPropertyValue ("--showEditor") == 0){
                this.style.setProperty("--showEditor", 1)
                this.style.setProperty("--showMag", 0)
                this.children[0].style.setProperty ("transform", "scale(1)")
                this.children[0].style.setProperty ("opacity", "1")
                this.children[0].children[0].children[0].value = simulation.loads[indexOfThis].mag
                this.children[0].children[1].children[0].value = simulation.loads[indexOfThis].x
            } else {
                this.style.setProperty("--showEditor", 0)
                document.activeElement.blur();
                this.children[0].style.setProperty ("transform", "scale(0)")
                this.children[0].style.setProperty ("opacity", "0")
            }
        })
        newElement.addEventListener("mousedown", function (e){
            if (this.style.getPropertyValue ("--showEditor") == 0) {
                this.className += " dragged"
            }
        })
    }
 
    
    newElement.style.setProperty ("left", (5+88*(load.x/data.L)) + "%")
    newElement.style.setProperty ("--showMag", 0)
    newElement.style.setProperty ("--showEditor", 0)
    newElement.style.setProperty ("--correspondingIndex", load.index)

    let editorDiv = document.createElement ("div")
    let childDivs = [document.createElement ("div"), document.createElement("div")]
    let childInputs = [document.createElement ("input"), document.createElement("input")]
    
    editorDiv.className = "loadEditor"
    childInputs[0].className = "miniInput"
    childInputs[0].setAttribute ("type", "number")
    childInputs[0].addEventListener ("input", function () {
        simulation.modifyLoad (indexOfThis, simulation.loads[indexOfThis].x, this.value)
        newElement.setAttribute ("mag", Math.round (load.mag) + " N")
        simulation.updateGraphs ()
    })

    childInputs[1].className = "miniInput"
    childInputs[1].setAttribute ("type", "number")
    childInputs[1].addEventListener ("input", function () {
        simulation.modifyLoad (indexOfThis, this.value, simulation.loads[indexOfThis].mag)
        newElement.style.setProperty ("left", (5+88*(this.value/simulation.L)) + "%")
        simulation.updateGraphs ()
    })

    childDivs[0].innerHTML = "Magnitude (N):"
    childDivs[0].appendChild (childInputs[0])

    childDivs[1].innerHTML = "Location (mm):"
    childDivs[1].appendChild (childInputs[1])
    editorDiv.appendChild (childDivs[0])
    editorDiv.appendChild (childDivs[1])
    if (draggable == undefined || draggable == true) {
        newElement.appendChild (editorDiv)
    }
    
    target.appendChild (newElement)
}

function updateGeoProperty (sim) {
    let settings = document.getElementsByTagName ("input")
    settings.namedItem ("centroid").value = Math.round(sim.centroid*100)/100
    settings.namedItem ("I").value = Math.round(sim.I)
    for (let i = 0; i < entryFields.length; i++) {
        entryFields[i].style.width = entryFields[i].value.length + "ch";
    }
}

function updateSetting (sim) {
    sim.estimateThickness ()
    let settings = document.getElementsByTagName ("input")
    settings.namedItem ("L").value = sim.sections[sim.currentSection].L

    document.getElementsByClassName ("lengthSelector")[0].setAttribute ("min", 0)
    document.getElementsByClassName ("lengthSelector")[0].setAttribute ("max", sim.sections[sim.currentSection].L)
    document.getElementsByClassName ("lengthSelector")[0].setAttribute ("value", sim.currentLength)
    document.getElementsByClassName ("lengthSelector")[0].previousElementSibling.setAttribute ("value", sim.currentLength)

    document.getElementsByClassName ("lengthSelector")[1].setAttribute ("min", simulation.interval)
    document.getElementsByClassName ("lengthSelector")[1].setAttribute ("max", simulation.L-simulation.interval)

    settings.namedItem ("H").value = sim.sections[sim.currentSection].layers[sim.currentLayer].H
    settings.namedItem ("wdH").value = sim.sections[sim.currentSection].layers[sim.currentLayer].wdH
    settings.namedItem ("wdL").value = sim.sections[sim.currentSection].layers[sim.currentLayer].wdL
    document.getElementsByClassName ("settingSubtitle")[0].children[2].innerHTML = "Section " + (sim.currentSection + 1) + "/" + sim.sections.length
    document.getElementsByClassName ("settingSubtitle")[1].children[2].innerHTML = "Layer " + (sim.currentLayer + 1) + "/"+ sim.sections[sim.currentSection].layers.length
    sim.calculationLocation = document.getElementsByClassName ("lengthSelector")[1].value

    for (let i = 0; i < entryFields.length; i++) {
        entryFields[i].style.width = entryFields[i].value.length + "ch";
    }
}


document.addEventListener ("mousemove", function (e){
    allLoads = document.getElementsByClassName("load")
    moving = false
    for (let i = 0; i < allLoads.length; i++){
        if (allLoads[i].className == "load dragged"){
            moving = true

            let leftLimit = document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().width/2
            let rightLimit = document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().width/2
            percentDist = (5+88*(e.clientX-leftLimit)/(rightLimit-leftLimit))
            if (percentDist > 93){
                allLoads[i].style = "left: 93%"
            } else if (percentDist < 5){
                allLoads[i].style = "left: 5%"
            } else {
                allLoads[i].style = "left: " + (5+88*(e.clientX-leftLimit)/(rightLimit-leftLimit)) + "%"
            }
            //allLoads[i].style = "left: " + (e.clientX - document.getElementsByClassName("loads")[0].getBoundingClientRect().left-(allLoads[i].getBoundingClientRect().right-allLoads[i].getBoundingClientRect().left)/2) + "px"
        }
    }

    
    if (moving) {
        updateLoads(simulation)
    }

    allLoadSets = document.getElementsByClassName("loadSet")
    moving = false
    for (let i = 0; i < allLoadSets.length; i++){
        if (allLoadSets[i].className == "loadSet dragged"){
            moving = true

            let leftLimit = document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().width/2
            let rightLimit = document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().width/2
            percentDist = (5+88*(e.clientX-leftLimit)/(rightLimit-leftLimit))
            allLoadSets[i].style.setProperty ("left", (5+88*(e.clientX-allLoadSets[i].style.getPropertyValue("--mouseOffset")-leftLimit)/(rightLimit-leftLimit)) + "%")
            /*
            if (percentDist > 93){
                allLoads[i].style = "left: 93%"
            } else if (percentDist < 5){
                allLoads[i].style = "left: 5%"
            } else {
                allLoads[i].style = "left: " + (5+88*(e.clientX-leftLimit)/(rightLimit-leftLimit)) + "%"
            }
            */
            //allLoads[i].style = "left: " + (e.clientX - document.getElementsByClassName("loads")[0].getBoundingClientRect().left-(allLoads[i].getBoundingClientRect().right-allLoads[i].getBoundingClientRect().left)/2) + "px"
        }
    }

    
    if (moving) {
        updateLoadSets(simulation)
    }
})

document.addEventListener ("mouseup", function (e){
    allForces = document.getElementsByClassName("loads")[0].children
    for (let i = 0; i < allForces.length; i++){
        if (allForces[i].className != "load reaction"){
            allForces[i].className = "load"
        }
    }

    allloadSets = document.getElementsByClassName ("loadSets")[0].children
    for (let i = 0; i < allloadSets.length; i++){
        if (allloadSets[i].className != "loadSet"){
            allloadSets[i].className = "loadSet"
        }
    }
})


function updateLoads (sim) {
    for (let i = 0; i < sim.loads.length; i++){
        let force = document.getElementsByClassName ("load")[sim.loads[i].index].getBoundingClientRect()
        force = force.x + force.width/2
        let leftLimit = document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().width/2
        let rightLimit = document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().width/2
        sim.modifyLoad (i, sim.L*(force-leftLimit)/(rightLimit-leftLimit), sim.loads[i].mag)
        //sim.loads[i].x = sim.L*(force-leftLimit)/(rightLimit-leftLimit)
    }
    simulation.updateGraphs ()
}

function updateLoadSets (sim) {
    for (let i = 0; i < sim.loadSets.length; i++){
        let force = document.getElementsByClassName ("loadSet")[sim.loadSets[i].index].getBoundingClientRect()
        force = force.x + force.width/2
        let leftLimit = document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[0].getBoundingClientRect().width/2
        let rightLimit = document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().x + document.getElementsByClassName ("load reaction")[1].getBoundingClientRect().width/2
        sim.moveLoadSet (i, sim.loadSets[i].size/2 + sim.L*(force-leftLimit)/(rightLimit-leftLimit))
        //sim.loads[i].x = sim.L*(force-leftLimit)/(rightLimit-leftLimit)
    }
    simulation.updateGraphs ()

}
 
function updateSupports (sim) {
    document.getElementsByClassName("reaction")[0].setAttribute ("mag", Math.round (sim.supportA) + " N")
    document.getElementsByClassName("reaction")[1].setAttribute ("mag", Math.round (sim.supportB) + " N")
}

function makeCrossSection (data, target) {
    data.calculateCrossSection ()

    target.innerHTML = ""
   
    let specifiedTarget = data.currentCrossSection
    totalHeight = 0
    var crossSection = {
        target: "#" + target.id,
        yAxis: {domain: []},
        xAxis: {domain: []},
        grid: true,
        width: 350,
        height: 275,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [

        ]
    };
    let limits = 0

    
    for (let i = 0; i < specifiedTarget.length; i++) {
        crossSection.data.push (specifiedTarget[i])
        limits = specifiedTarget[i].range[1]
    }
    crossSection.xAxis = {domain: [-limits*0.1, limits*1.1], label:"Height From Bottom (mm)"}
    crossSection.yAxis = {domain: [-limits*0.1, limits*1.5], label:"Width (mm)"}
    crossSection.annotations = [{x:data.centroid, text: "Centroid"}]
    functionPlot (crossSection)
    //console.log (crossSection)
}

function drawStress (sim) {
    document.getElementById ("bendingStress").innerHTML = ""
    document.getElementById ("shearStress").innerHTML = ""
    sim.calculateMomentStress ()
    sim.calculateShearStress ()
    var bendingGraph = {
        target: "#bendingStress",
        //yAxis: {domain: [-Math.max(sim.supportA, sim.supportB)*1.25, Math.max(sim.supportA, sim.supportB)*1.1], label: "Shear Force"},
        yAxis: {domain: [-8, 32], label: "Bending Flextual Stress"},
        xAxis: {domain: [-sim.T, sim.T], label: "Distance From Centroid"},
        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: sim.momentStress,
        annotations: [{y: -6, text: 'Compression Failure'}, {y: 30, text: "Tension Failure"}]
    }

    var shearGraph = {
        target: "#shearStress",
        //yAxis: {domain: [-Math.max(sim.supportA, sim.supportB)*1.25, Math.max(sim.supportA, sim.supportB)*1.1], label: "Shear Force"},
        yAxis: {domain: [-0.5, 4.5], label: "Shear Stress"},
        xAxis: {domain: [-sim.T, sim.T], label: "Distance From Centroid"},
        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: sim.shearStress,
        annotations: [{y: 2, text: 'Glue Shear Failure'}, {y: 4, text: "Matboard Shear Failure"}]
    }
    let mStress = functionPlot(bendingGraph)
    let vStress = functionPlot(shearGraph)
}


function makeGraphs (sim){
    document.getElementById ("sfd").innerHTML = ""
    document.getElementById ("bmd").innerHTML = ""
    var SFDGraph = {
        target: "#sfd",
        //yAxis: {domain: [-Math.max(sim.supportA, sim.supportB)*1.25, Math.max(sim.supportA, sim.supportB)*1.1], label: "Shear Force"},
        yAxis: {domain: [-400, 400], label: "Shear Force"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: sim.SFD
    };

    SFDGraph.data.push ({points: sim.SFDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    var BMDGraph = {
        target: "#bmd",
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-100000*0.1, 100000*1.1], label: "Internal Bending Moment"},
        
        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: sim.BMD,
        annotations: []
    }
    BMDGraph.data.push ({points: sim.BMDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})
    
    //BMDGraph.data.push ({points: sim.compressionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    //BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})
    
    let SFD = functionPlot (SFDGraph)
    let BMD = functionPlot (BMDGraph)
    
    SFD.addLink (BMD)
    BMD.addLink (SFD)

    SFD.meta.yAxis.tickFormat(newFormat (SFD.meta.yAxis, "N"))
    BMD.meta.yAxis.tickFormat(newFormat (BMD.meta.yAxis, "Nmm"))

    SFD.draw()
    BMD.draw()
}

function newFormat (target, unit){
    const oldFormat = target.tickFormat()
    const newFormat = function (d){
        return (addSpaceBetween (oldFormat(d)) + unit)
    }
    return newFormat
}

function addSpaceBetween (s) {
    let returnVar = []
    let spaced = false
    for (let i = 0; i < s.length; i++) {
        if (isNaN(s[i]/10) && !spaced && s[i] != "−"){
            returnVar.push (" ")
            spaced = true
        } 
        returnVar.push (s[i])
    }
    if (!spaced){
        returnVar.push (" ")
    }
    return (returnVar.join(""))
}

function compareMoment (sim) {
    let FOS = simulation.getMomentFOS ()
    document.getElementById ("compareBMD").innerHTML = ""
    var BMDGraph = {
        target: "#compareBMD",
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-sim.maxMomentCapacity*0.1, sim.maxMomentCapacity*1.1], label: "Internal Bending Moment"},

        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [],
        annotations: []
    }
    BMDGraph.data.push ({points: sim.BMDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    BMDGraph.data.push ({points: sim.compressionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})

    let BMD = functionPlot (BMDGraph)

    //BMD.addLink (SFD)

    BMD.meta.yAxis.tickFormat(newFormat (BMD.meta.yAxis, "Nmm"))

    BMD.draw()

    document.getElementById ("FOSTension").innerHTML = "FOS in Tension:" +  FOS[0]
    document.getElementById ("FOSCompression").innerHTML = "FOS in Compression:" + FOS[1]
}

function compareShear (sim) {
    FOS = simulation.getShearFOS ()
    document.getElementById ("compareSFD").innerHTML = ""
    var SFDGraph = {
        target: "#compareSFD",
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-sim.maxShearCapacity*1.1, sim.maxShearCapacity*1.1], label: "Shear Force"},

        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [],
        annotations: []
    }
    SFDGraph.data.push ({points: sim.SFDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    SFDGraph.data.push ({points: sim.shearLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    //BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})

    let SFD = functionPlot (SFDGraph)

    //BMD.addLink (SFD)

    SFD.meta.yAxis.tickFormat(newFormat (SFD.meta.yAxis, "N"))

    SFD.draw()
    document.getElementById ("FOSShear").innerHTML = "Shear Force In Matboard FOS:" +  FOS
}


function compareGlue (sim, loc) {
    try {
         let error = JSON.parse ("[" + loc + "]")[0][0]
    }
    catch (err) {
        alert ("Error: Glue Location Invalid")
        return
    }

    if (JSON.parse ("[" + loc + "]").length != sim.sections.length){
        alert ("Error: Length of glue location invalid")
        return
    }

    document.getElementById ("compareGlue").innerHTML = ""
    FOS = simulation.getGlueFOS (loc)
    var SFDGraph = {
        target: "#compareGlue",
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-sim.maxGlueCapacity*1.1, sim.maxGlueCapacity*1.1], label: "Shear Force"},

        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [],
        annotations: []
    }
    SFDGraph.data.push ({points: sim.SFDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    SFDGraph.data.push ({points: sim.glueLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    //BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})

    let SFD = functionPlot (SFDGraph)

    //BMD.addLink (SFD)

    SFD.meta.yAxis.tickFormat(newFormat (SFD.meta.yAxis, "N"))

    SFD.draw()

    document.getElementById ("FOSGlue").innerHTML = "Glue FOS:" +  FOS

}


function compareMomentBuckling (sim, info, target, target2) {
    try {
         let error = info.split(',')
    }
    catch (err) {
        alert ("Error: Entry Invalid")
        return
    }

    if (info.split(',').length != 5){
        alert ("Error: Length entry location invalid")
        return
    }
    let infoParam = info.split(',')
    infoParam = infoParam.map(String) 

    document.getElementById (target).innerHTML = ""
    FOS = simulation.getBucklingMomentFOS (infoParam[0], infoParam[1],infoParam[2],infoParam[3],infoParam[4])
   // (section, layer, k, b, t)
    var BMDGraph = {
        target: "#" + target,
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-1000,100000], label: "Bending Moment"},

        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [],
        annotations: []
    }
    BMDGraph.data.push ({points: sim.BMDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    BMDGraph.data.push ({points: FOS[0], fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    //BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})

    let BMD = functionPlot (BMDGraph)

    //BMD.addLink (SFD)

    BMD.meta.yAxis.tickFormat(newFormat (BMD.meta.yAxis, "Nmm"))

    BMD.draw()

    document.getElementById (target2).innerHTML = "Moment Buckling FOS:" +  FOS[1]

}

function compareShearBuckling (sim, info, target, target2) {
    try {
         let error = info.split(',')
    }
    catch (err) {
        alert ("Error: Entry Invalid")
        return
    }

    if (info.split(',').length != 5){
        alert ("Error: Length entry location invalid")
        return
    }
    let infoParam = info.split(',')
    infoParam = infoParam.map(String)

    document.getElementById (target).innerHTML = ""
    FOS = simulation.getBucklingShearFOS (infoParam[0], infoParam[1],infoParam[2],infoParam[3],infoParam[4])
   // (section, layer, k, b, t)
    var SFDGraph = {
        target: "#" + target,
        //yAxis: {domain: [-1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2, 1.1*Math.max(sim.supportA, sim.supportB)*1.1*sim.L/2], label: "Internal Bending Moment"},
        xAxis: {domain: [-sim.L*0.05, sim.L*1.05], label: "Distance From Left Support (mm)"},
        yAxis: {domain: [-500,500], label: "Shear Force"},

        grid: true,
        tip: {
            xLine: true,    // dashed line parallel to y = 0
            yLine: true,    // dashed line parallel to x = 0
        },
        data: [],
        annotations: []
    }
    SFDGraph.data.push ({points: sim.SFDEnvalope, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[1]})

    SFDGraph.data.push ({points: FOS[0], fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[2]})
    //BMDGraph.data.push ({points: sim.tensionLimit, fnType: 'points', graphType: 'scatter', color: functionPlot.globals.COLORS[3]})

    let SFD = functionPlot (SFDGraph)

    //BMD.addLink (SFD)

    SFD.meta.yAxis.tickFormat(newFormat (SFD.meta.yAxis, "N"))

    SFD.draw()

    document.getElementById (target2).innerHTML = "Shear Buckling FOS:" +  FOS[1]

}


document.getElementById ("bendingForce").addEventListener ("click", function (){
compareMoment (simulation)
})

document.getElementById ("shearForce").addEventListener ("click", function (){
compareShear (simulation)
})


document.getElementById ("glueForce").addEventListener ("click", function (){
compareGlue (simulation, document.getElementById ("glueLocation").value)
})

document.getElementById ("criticalMoment0").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo0").value, "compareCriticalMoment0", "FOSBuckleMoment0")
})

document.getElementById ("criticalMoment1").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo1").value, "compareCriticalMoment1", "FOSBuckleMoment1")
})

document.getElementById ("criticalMoment2").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo2").value, "compareCriticalMoment2", "FOSBuckleMoment2")
})

document.getElementById ("criticalMoment3").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo3").value, "compareCriticalMoment3", "FOSBuckleMoment3")
})

document.getElementById ("criticalMoment4").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo4").value, "compareCriticalMoment4", "FOSBuckleMoment4")
})

document.getElementById ("criticalMoment5").addEventListener ("click", function (){
compareMomentBuckling (simulation, document.getElementById ("momentBucklingInfo5").value, "compareCriticalMoment5", "FOSBuckleMoment5")
})

document.getElementById ("criticalShear").addEventListener ("click", function (){
compareShearBuckling (simulation, document.getElementById ("shearBucklingInfo").value, "compareCriticalShear", "FOSBuckleShear")
})


//simulation.getBreakingPoints()
simulation.calculateSFD ()
simulation.calculateBMD ()
makeGraphs (simulation)
drawStress (simulation)








//setTimeout(function (){simulation.makeLoadsetEnvalope(simulation.loadSets[0], 5)}, 5000

// Belegarbeit IT1
// s68428 - Thomas Klaue
// s68394 - Martin Stiehr

// --------- setup
var clients   = 5;					       // Anzahl der Sender
var last      = 0.1;                    // Gesamtpaketwahrscheinlichkeit
var slots     = 10;					       // Anzahl der dargestellten "Paketzeiten" 
var details   = 10;					       // Zeitschlitze pro Paketzeit
var rate      = 20;                     // *1/s
var __high    = 1;                      // positiv
var __low     = 0;                      // neutral
var __fail    = 4;                      // negativ
var __init    = __low;                  // Standardbelegung
var curState  = 0;                      // Zustand der Simulation: an/aus
var offset    = details;                // Versatz (nicht sichtbarer Bereich), genau eine "Paketzeit"
var columns   = slots*details+offset;   // Gesamtzahl der Spalten
var matrix    = createMatrix();         // das Netz wird als 2d-Array betrachtet
var interval  = 0;                      // "Wartezeit", wird später berechnet
var sent      = 0;                      // wird in der Funktion dice() gesteuert
var arrivedPackets = 0;                 // wird in der Funktion drawCanvas() gesteuert
var _canvas   = document.getElementById("leinwand");
var _context  = _canvas.getContext('2d');
  _context.lineWidth = 2;
var packetHeight   = 25;                // Höhe (Pixel) der Paketzeichnungen


// ========= functions
function flow()
{
  //console.log("Simulationsschritt");
  // aufräumen, falls anzahl der clients verringert wurde
  for(var line=clients; line<10; line++) {
    if (matrix[line]) 
      matrix[line] = null; 
  }
  /* Die Felder [0]:[offset-1] sind nicht sichtbar.
	 * Das Feld [offset-1] wird zum Würfeln benutzt.
	 * Die rechte Spalte wird entfernt (pop()),
	 * anschließend wird das Gesamte Array nach rechts verschoben (unshift())
	 */
	 for(var c=0; c<clients; c++) {
	   if(!matrix[c]) { // zeile wurde bisher noch nicht initialisiert, weil grad erst dazugekommen
	     matrix[c] = [];
	     for(var s=0; s<columns; s++)
          matrix[c][s] = __init;
	   }
	   matrix[c].pop();	// den rechten slot in jedem client entfernen
	   if(matrix[c][offset-1]==__init) { // nur würfeln, wenn noch nicht "belegt"
	     if(dice()) {
	       for(var spalte=0; spalte<offset; spalte++) // bei Erfolg gleich 10 "Bits" schreiben
	         matrix[c][spalte] = __high;
	       sent++; // Statistik
	       for(var spalte=0; spalte<offset; spalte++)
	         matrix[10][spalte]++; // Statuszeile aktualisieren
	     } else 
	       matrix[c][offset-1] = __low; 
	   }
	   matrix[c].unshift(__init);  // anschließend von vorn mit 0 auffüllen
	 }	 
	 matrix[10].pop();                // Statuszeile
	 matrix[10].unshift(__init);      // verschieben
    detectErrors(); // nach Überlagerungen suchen 
	 drawCanvas();   // zeichnen
	 //textOutput(); // Debugging-Ausgabemodus
	 printStats();   // Statistik aktualisieren
}


function dice() // trifft die Entscheidung, ob ein Paket versendet wird oder nicht 
{
  if(Math.random()>(last/clients)) // negativ
    return 0;
  else // positiv
    return 1;
}


function drawCanvas() 
{
  _context.fillStyle = 'cornsilk';
  //_context.clearRect(0,0,_canvas.width, _canvas.height);
  _context.fillRect (0,0,_canvas.width, _canvas.height);
  _context.beginPath();
    _context.moveTo(0,290);
    _context.lineTo(_canvas.width,290);
  _context.closePath();
  _context.stroke();
  var statusDrawn = [];
  /* alle Teilnehmer durchlaufen */
  for(var zeile=0; zeile<10; zeile++) {
    if(matrix[zeile]==undefined || ((zeile > clients) && zeile!=10)) // Obacht zwecks Statuszeile!
      continue; // Überspringen, ansonsten alle spalten durchlaufen */
    var part=0;
    for(var spalte=0; spalte<columns; spalte++) {
    	  if(matrix[zeile][spalte]==__low) 
    	    continue; // nichts zu zeichnen
    	  part = (part+1)%10; /* läuft von 1,2,...,9,0 */
    	  if(part==1) { // Anfang eines Paketes (linke Seite)
    	    /*if(matrix[zeile][spalte]==__high) {
    	      _context.fillStyle = "green";
    	    }*/
    	    _context.fillStyle = (matrix[zeile][spalte]==__high) ? "green" : "red"; // gültige Pakete werden grün, ungültige rot gezeichnet
    	    _context.fillRect  ((spalte-offset)*5,zeile*(packetHeight+3)+3,5*details,packetHeight);
    	    _context.strokeRect((spalte-offset)*5,zeile*(packetHeight+3)+3,5*details,packetHeight);
    	    if(spalte==(columns-10) && matrix[zeile][spalte]==__high && matrix[zeile][spalte+9]==__high)
    	    	arrivedPackets++; // ein gültiges Paket hat das Ziel erreicht 
    	    if(statusDrawn[spalte]==undefined) { // Statuszeile zeichnen
    	      statusDrawn[spalte] = 1;
    	      _context.fillRect  ((spalte-offset)*5,10*(packetHeight+3)+3+10,5*details, packetHeight/2);
    	      //_context.strokeRect((spalte-offset)*5,10*(packetHeight+3)+3,5*details, packetHeight);
    	    }
    	  }
    }
  }
}


function createMatrix() // Generierung eines 2d-Array und Belegung aller Zellen mit __init
{
  var tmpMatrix = []; //new Array();
  for(var z=0; z<11; z++) { // inkl. Statuszeile 
    tmpMatrix[z] = []; //new Array();
    for(var s=0; s<columns; s++)
      tmpMatrix[z][s] = __init;
  }
  return tmpMatrix;
}


function start()
{
  if(!curState) {
    interval = window.setInterval(flow,1000/rate);
    curState = 1;
  }
}


function stop()
{
  window.clearInterval(interval);
  curState = 0;
}

function restart()
{
	if(curState==1) {
		stop();
		start();
	}
}

function detectErrors() // Erkennen von Überlagerungen und Markierung mit __fail
{
  var pakete=0;
  for(var client=0; client<clients; client++) {
    if(!matrix[client])
      continue;
    var teile=0;
    for(var column=0; column<10; column++) {
      if(matrix[client][offset-column]!=__low) 
        teile++;
    }
    if(teile>0)
      pakete++;
  }
  if(pakete>1) { // jetzt nochmal durchhangeln und werte korrigieren
    for(var zeile=0; zeile<clients; zeile++) {
      if(!matrix[zeile])
        continue;
      for(var spalte=0; spalte<10; spalte++) {
        if(matrix[zeile][offset-spalte]!=__low)
          matrix[zeile][offset-spalte] = __fail;
      }
    }
  }
}


function textOutput() // for debugging only 
{
	var space = document.getElementById("textOutput");
	space.innerHTML = null;
	for(var z=0; z<11; z++) {
		if(matrix[z]!=undefined)
		for(var r=offset; r<columns; r++) {
			space.innerHTML += matrix[z][r];
		}
		space.innerHTML += "<br/>";
	}
}


function setValue(id, value) // belegt ein HTML-Element mit einem bestimmten Wert 
{
  document.getElementById(id).innerHTML=value;
}


function printStats() {  // gibt die aktuelle Statistik aus 
  var s = document.getElementById("sentOutput");
  var l = document.getElementById("arrivedOutput");
  var r = document.getElementById("ratio");
  s.innerHTML = sent;
  l.innerHTML = arrivedPackets;
  r.innerHTML = (Math.ceil(((arrivedPackets*100)/sent)*100))/100 + " %";
}
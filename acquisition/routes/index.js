var express = require('express');
var router = express.Router();
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

const port = "COM5"

const arduino = new SerialPort({
  path: port,
  baudRate: 9600
})

arduino.on('error', (err)=>{
  console.log(err);
})

const etat = {
  lastTimestamp: 0,
  lastAcquisition: NaN,
  idle: true,
  cptY: 0,
  cptP: 0,
  cptO: 0,
}

let currentSession = null

const parser = arduino.pipe(new ReadlineParser({ delimiter: '\r\n' }))

parser.on('data', (data)=>{
  if(etat.lastAcquisition == "Empty")
  {
    etat.cptY = 0
    etat.cptP = 0
    etat.cptO = 0
  }
  etat.lastTimestamp = new Date()
  etat.lastAcquisition = String(data)
  etat.cptY = Number(etat.lastAcquisition === "Yellow" ? etat.cptY+1 : etat.cptY)
  etat.cptP = Number(etat.lastAcquisition === "Pink" ? etat.cptP+1 : etat.cptP)
  etat.cptO = Number(etat.lastAcquisition === "Other" ? etat.cptO+1 : etat.cptO)
  console.log(etat.cptY)
  console.log(etat.cptP)
  console.log(etat.cptO)
  //etat.compteur = etat.compteur+1
  if(etat.idle === false && currentSession){
    prisma.measure.create({ data: {
      time: etat.lastTimestamp,
      value: etat.lastAcquisition,
      idSession: currentSession.id
    }}).then()
    prisma.container.create({ data: {
      type: etat.lastAcquisition,
      numBalls: etat.lastAcquisition === "Yellow" ? etat.cptY : etat.lastAcquisition === "Pink" ? etat.cptP : etat.lastAcquisition === "Other" ? etat.cptO : undifined,
      idSession: currentSession.id
    }}).then()
  }
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {  });
});

router.get('/log', async (req, res, next)=> {
  const sessions = await prisma.session.findMany()
  res.render('historic', { sessions: sessions })
})

router.post('/api/getSessionValues', (req, res, next)=>{
  const idSession = Number(req.body.idSession)
  prisma.measure.findMany({
    where: {
      idSession: idSession
    }
  }).then(val=>{
    res.status(200).json(val)
  })
})

router.post('/api/getSessionContainers', (req, res, next)=>{
  const idSession = Number(req.body.idSession)
  prisma.container.findMany({
    where: {
      idSession: idSession
    }
  }).then(val=>{
    res.status(200).json(val)
  })
})


router.post('/api/start', (req, res, next)=>{
  if(etat.idle === true){
    etat.idle=false
    etat.cptY = 0
    etat.cptP = 0
    etat.cptO = 0
    startLogging()
    res.status(200).send()
  } else {
    res.status(403).send()
  }
})

router.post('/api/stop', (req, res, next)=>{
  if(etat.idle === false){
    etat.idle=true
    stopLogging()
    res.status(200).send()
  } else {
    res.status(403).send()
  }
  
})

router.post('/api/reset', (req, res, next)=>{
  if(etat.idle === true)
    {
      arduino.write("oui\n")
      etat.cptY = 0
      etat.cptP = 0
      etat.cptO = 0
      res.status(200).send()
    } else {
      res.status(403).send()
    }
})

router.post('/api/state', (req, res, next)=>{
  res.status(200).json(etat)
})

async function startLogging(){
  // Creer une nouvelle session
  currentSession = await prisma.session.create({})
  console.log(currentSession);
}

function stopLogging(){
  // Arreter la session en cours
  prisma.session.update({
    where: {
      id: currentSession.id
    },
    data: {
      stop: new Date()
    }
  }).then((v)=> {
    currentSession = null
    console.log('Session '+ v.id + ' closed');
  })
}

module.exports = router;

const connection = {
    host: process.env.HOST,
    user: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
  },
  databaseTable = process.env.TABLE,
  lambdaRegion = process.env.REGION

const Scheduler = require('./app/components/scheduler')
let scheduler = new Scheduler(connection, databaseTable)
    

module.exports.lambda1 = (event, context, callback) => {
  const Aws = require('aws-sdk')
  let awsLambda = new Aws.Lambda({
    region: lambdaRegion
  })

  scheduler.getQueuedTasks().then( (queuedTasks) => {
    if (queuedTasks.length) {
      let requestsCounter = 0,
        successRequestCounter = 0

      queuedTasks.forEach( (task) => {
        const params = {
          ClientContext: 'lambda-1',
          FunctionName: 'lambda-2',
          InvocationType: 'Event',
          Payload: JSON.stringify(task)
        }

        requestsCounter++
        awsLambda.invoke(params, (error, data) => {
          if (error) {
            console.error(error)
          } else {
            successRequestCounter++
          }

          if (requestsCounter === queuedTasks.length) {
            scheduler.close().then( () => {
              callback(null, `Jobs sent to Lambda No.2: ${successRequestCounter} of ${requestsCounter}`)
            })
          }
        })
      })
    } else {
      scheduler.close().then( () => {
        callback(null, 'No Results')
      })
    }  
  }).catch( (error) => {
    console.error(error)
    callback(null, 'Failed')
  })
}


module.exports.lambda2 = (event, context, callback) => {
  console.log(`Row data fetched by Lambda No.1: ${JSON.stringify(event)}`)
  const taskId = event.task_id

  scheduler.lockTask(taskId).then(() => {
    scheduler.triggerTask().then( (responseData) => {
      console.log(`Response data: ${responseData.data}`)
      
      const finishTaskFunc = (functionName) => {
        scheduler[functionName](taskId).then( () => {
          scheduler.close().then( () => {
            callback(null, (responseData.success ? 'Success' : 'Failed') )
          })
        })
      }

      if (responseData.success) {
        finishTaskFunc('completeTask')
      } else {
        finishTaskFunc('reQueueTask')
      }
    })
  }).catch( (error) => {
    console.error(error)
    callback(null, 'Failed')
  })
}


module.exports.lambda3 = (event, context, callback) => {
  scheduler.getAllTasks().then( (tasks) => {
    const response = {
      statusCode: 200,
      headers: {
        'x-custom-header': 'My Header Value',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 'tasks': tasks })
    }

    scheduler.close().then( () => {
      callback(null, response)
    })
  }).catch( (error) => {
    console.error(error)
    callback(null, 'Error')
  })
}
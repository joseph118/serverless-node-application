/**
 * Class representing the scheduler.
 */
class Scheduler {
    /**
     * Creates the scheduler.
     */
    constructor(dbConnection, table) {      
        this.dbConnection = dbConnection
        this.table = table
        this._createPool()
    }

    /**
     * Generates a pool if it is not generated.
     */
    _createPool() {
        if (!this.dbPool || this.dbPool._closed) {
            const MySql = require('mysql')
            this.dbPool = MySql.createPool(this.dbConnection)
        }
    }

    /**
     * Closes down the pool.
     * @returns {Promise} A promise that the connection has been closed.
     */
    close() {
        return new Promise((resolve, reject) => {
            this.dbPool.end( (error) => {
                resolve()
            })
        })
    }

    /**
     * Executes the given query.
     * @param {string} sqlQuery - The sql query.
     * @returns {Promise} A promise containing the recordset.
     */
    executeQuery(sqlQuery) {
        return new Promise((resolve, reject) => {
            this._createPool()

            this.dbPool.getConnection( (error, connection) => {
                if (error) {
                    this.close()
                    reject(error)
                } else {
                    connection.query(sqlQuery, (error, recordSet) => {
                        if (error) {
                            this.close()
                            reject(error)
                        } else {
                            resolve(recordSet)
                        }
                    })
                }
            })
        })
    }

    /**
     * Gets all the tasks.
     * @returns {Promise} A promise containing the recordset.
     */
    getAllTasks() {
        const sqlQuery = 
                'SELECT task_id, status, ' +
                  'DATE_FORMAT(created_at, \'%Y-%m-%d %H:%i:%s\') AS created_at, ' +
                  'DATE_FORMAT(updated_at, \'%Y-%m-%d %H:%i:%s\') AS updated_at, ' +
                  'DATE_FORMAT(scheduled_run, \'%Y-%m-%d %H:%i:%s\') AS scheduled_run, ' + 
                  'locked ' +
                `FROM ${this.table} ` +
                'ORDER BY scheduled_run DESC, updated_at DESC, created_at ASC'

        return this.executeQuery(sqlQuery)
    }

    /**
     * Sends a requests to the following url: 'https://httpbin.org/get?test=1', and returns
     * if the request was a success or fail.
     * @returns {Promise} A promise containing an object with the response.
     */
    triggerTask() {
        return new Promise((resolve, reject) => {
            const request = require('request'),
                url = 'https://httpbin.org/get?test=1'
            
            let responseData = {
                success: false,
                data: ''
            }

            request.get(url, (error, response, body) => {
                responseData.data = body
                
                if (!error && response.statusCode === 200) {
                    responseData.success = true
                }

                resolve(responseData)
            })
        })
    }

    /**
     * Gets all the queued tasks.
     * @returns {Promise} A promise containing the recordset.
     */
    getQueuedTasks() {
        const sqlQuery = 
            'SELECT task_id ' +
            `FROM ${this.table} ` +
            'WHERE status = \'QUEUED\' ' +
            'AND locked = false ' +
            'AND scheduled_run <= DATE_ADD(NOW(), INTERVAL 5 MINUTE)'

        return this.executeQuery(sqlQuery)
    }

    /**
     * Locks the given task by changing the status to PROCESSING.
     * @param {string} taskId - The task ID.
     * @returns {Promise} A promise containing the recordset.
     */
    lockTask(taskId) {
        const sqlQuery = 
            `UPDATE ${this.table} ` +
            'SET locked = true, status = \'PROCESSING\', updated_at = NOW() ' +
            `WHERE task_id = ${taskId}`
        
        return this.executeQuery(sqlQuery)
    }

    /**
     * Re-queues the given task by changing the status to QUEUED.
     * @param {string} taskId - The task ID.
     * @returns {Promise} A promise containing the recordset.
     */
    reQueueTask(taskId) {
        const sqlQuery = 
            `UPDATE ${this.table} ` +
            'SET locked = false, status = \'QUEUED\', updated_at = NOW() ' +
            `WHERE task_id = ${taskId}`

        return this.executeQuery(sqlQuery)
    }

    /**
     * Completes the given task by changing the status to COMPLETED.
     * @param {string} taskId - The task ID.
     * @returns {Promise} A promise containing the recordset.
     */
    completeTask(taskId) {
        const sqlQuery = 
            `UPDATE ${this.table} ` +
            'SET locked = false, status = \'COMPLETED\', updated_at = NOW() ' +
            `WHERE task_id = ${taskId}`
    
        return this.executeQuery(sqlQuery)
    }
}

module.exports = Scheduler
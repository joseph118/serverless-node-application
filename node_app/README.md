# Lambda 1 is triggered every 5 minutes, and would check for any pending tasks.
# Lambda 1 invokes Lambda 2 to trigger the processing of the task and based on the success, it will either complete the task or re-queues the task.
# Lambda 3 is triggered by the API Gateway
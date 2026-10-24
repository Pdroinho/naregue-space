process.env.NODE_ENV='test'
process.env.ENV_FILE='.validation/no-env'
process.env.AI_ASSISTANT_ENABLED='false'
process.env.ABACATEPAY_CHECKOUT_ENABLED='false'
process.env.DATABASE_PATH=`.validation/tests-${process.pid}.db`

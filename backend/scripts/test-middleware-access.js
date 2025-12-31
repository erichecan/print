const { authorizeRoles } = require('../src/middleware/auth');

function mockNext(error) {
    if (error) {
        console.error('❌ FAILED: Middleware returned error:', error.message);
        process.exit(1);
    }
    console.log('✅ PASSED: Middleware called next()');
}

function mockRes() {
    return {
        status: (code) => ({
            json: (body) => console.log(`Response: ${code}`, body),
            send: (body) => console.log(`Response: ${code}`, body),
        }),
    };
}

console.log('Test 1: Sales Manager accessing Admin route');
const salesManagerReq = {
    path: '/test',
    user: {
        role: 'SALES_MANAGER',
    },
};
// The updated requireAdmin uses authorizeRoles('ADMIN', 'SALES_MANAGER')
const middleware = authorizeRoles('ADMIN', 'SALES_MANAGER');

try {
    middleware(salesManagerReq, mockRes(), mockNext);
} catch (e) {
    console.error('❌ FAILED: Exception thrown', e);
    process.exit(1);
}

console.log('\nTest 2: Customer accessing Admin route');
const customerReq = {
    path: '/test',
    user: {
        role: 'CUSTOMER',
    },
};

let customerFailed = false;
const mockNextCustomer = (error) => {
    if (error) {
        console.log('✅ PASSED: Customer correctly denied access:', error.message);
        customerFailed = true;
    } else {
        console.error('❌ FAILED: Customer was allowed access');
        process.exit(1);
    }
};

try {
    middleware(customerReq, mockRes(), mockNextCustomer);
} catch (e) {
    console.log('✅ PASSED: Customer denied access (exception)', e.message);
}

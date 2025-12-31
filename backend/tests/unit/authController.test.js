/**
 * Authentication Controller Tests
* Unit tests for authentication API
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const prisma = require('../../src/lib/prisma');
const authController = require('../../src/controllers/authController');

// Mock environment variables
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRES_IN = '7d';

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
}

describe(' authController.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CUSTOMER',
      emailVerified: false,
      createdAt: new Date(),
    };

    prisma.user.findUnique.mockResolvedValueOnce(null); // User doesn't exist
    bcrypt.hash.mockResolvedValueOnce('hashed_password');
    prisma.user.create.mockResolvedValueOnce(mockUser);
    jwt.sign.mockReturnValueOnce('mock_jwt_token');

    const req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      token: 'mock_jwt_token',
      user: expect.objectContaining({
        email: 'test@example.com',
      }),
    });
  });

  it('should return 400 if email is missing', async () => {
    const req = {
      body: {
        password: 'password123',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email and password are required',
    });
  });

  it('should return 400 if password is missing', async () => {
    const req = {
      body: {
        email: 'test@example.com',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email and password are required',
    });
  });

  it('should return 400 if password is too short', async () => {
    const req = {
      body: {
        email: 'test@example.com',
        password: 'short',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Password must be at least 8 characters',
    });
  });

  it('should return 400 if user already exists', async () => {
    const existingUser = {
      id: 'user_123',
      email: 'test@example.com',
    };

    prisma.user.findUnique.mockResolvedValueOnce(existingUser);

    const req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'User with this email already exists',
    });
  });
});

describe(' authController.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login user successfully', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CUSTOMER',
      emailVerified: false,
    };

    prisma.user.findUnique.mockResolvedValueOnce(mockUser);
    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockReturnValueOnce('mock_jwt_token');

    const req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    };
    const res = createMockResponse();

    await authController.login(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      token: 'mock_jwt_token',
      user: expect.objectContaining({
        email: 'test@example.com',
      }),
    });
  });

  it('should return 400 if email is missing', async () => {
    const req = {
      body: {
        password: 'password123',
      },
    };
    const res = createMockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email and password are required',
    });
  });

  it('should return 401 if user not found', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
      },
    };
    const res = createMockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid email or password',
    });
  });

  it('should return 401 if password is incorrect', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
    };

    prisma.user.findUnique.mockResolvedValueOnce(mockUser);
    bcrypt.compare.mockResolvedValueOnce(false);

    const req = {
      body: {
        email: 'test@example.com',
        password: 'wrong_password',
      },
    };
    const res = createMockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid email or password',
    });
  });
});

describe(' authController.logout', () => {
  it('should logout user successfully', async () => {
    const req = {};
    const res = createMockResponse();

    await authController.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('token', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });
});

describe(' authController.me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return current user', async () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'CUSTOMER',
      emailVerified: false,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.user.findUnique.mockResolvedValueOnce(mockUser);

    const req = {
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await authController.me(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      select: expect.any(Object),
    });
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });

  it('should return 401 if user not authenticated', async () => {
    const req = {
      user: null,
    };
    const res = createMockResponse();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not authenticated',
    });
  });

  it('should return 404 if user not found', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const req = {
      user: {
        id: 'user_123',
      },
    };
    const res = createMockResponse();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'User not found',
    });
  });
});

describe(' authController.forgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success message even if user not found (security)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const req = {
      body: {
        email: 'nonexistent@example.com',
      },
    };
    const res = createMockResponse();

    await authController.forgotPassword(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });

  it('should return 400 if email is missing', async () => {
    const req = {
      body: {},
    };
    const res = createMockResponse();

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email is required',
    });
  });
});

describe(' authController.resetPassword', () => {
  it('should reset password successfully', async () => {
    const req = {
      body: {
        token: 'reset_token',
        password: 'newpassword123',
      },
    };
    const res = createMockResponse();

    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'user_123',
      email: 'test@example.com',
      passwordResetToken: 'reset_token',
    });
    bcrypt.hash.mockResolvedValueOnce('new_hashed_password');
    prisma.user.update.mockResolvedValueOnce({});

    await authController.resetPassword(req, res);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ passwordResetToken: 'reset_token' })
    }));
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user_123' },
      data: expect.objectContaining({
        passwordHash: 'new_hashed_password',
        passwordResetToken: null
      })
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('successfully')
    }));
  });

  it('should return 400 if token is missing', async () => {
    const req = {
      body: {
        password: 'newpassword123',
      },
    };
    const res = createMockResponse();

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token and password are required',
    });
  });

  it('should return 400 if password is too short', async () => {
    const req = {
      body: {
        token: 'reset_token',
        password: 'short',
      },
    };
    const res = createMockResponse();

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Password must be at least 8 characters',
    });
  });
});


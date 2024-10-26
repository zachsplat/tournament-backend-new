// tests/models/user.test.js
const { User } = require('../../models');

describe('User Model', () => {
  beforeAll(async () => {
    await User.sync({ force: true }); // Reset User table before tests
  });

  it('should create a user with valid email and password', async () => {
    const user = await User.create({
      email: 'validuser@example.com',
      password_hash: 'hashedpassword',
    });

    expect(user).toHaveProperty('user_id');
    expect(user.email).toBe('validuser@example.com');
    expect(user.role).toBe('user'); // Default role
  });

  it('should not create a user with invalid email', async () => {
    await expect(User.create({
      email: 'invalid-email',
      password_hash: 'hashedpassword',
    })).rejects.toThrow();
  });

  it('should enforce unique email constraint', async () => {
    await User.create({
      email: 'uniqueuser@example.com',
      password_hash: 'hashedpassword',
    });

    await expect(User.create({
      email: 'uniqueuser@example.com',
      password_hash: 'anotherhashedpassword',
    })).rejects.toThrow();
  });

  it('should allow specifying user role', async () => {
    const adminUser = await User.create({
      email: 'adminuser@example.com',
      password_hash: 'adminhashedpassword',
      role: 'admin',
    });

    expect(adminUser.role).toBe('admin');
  });
});

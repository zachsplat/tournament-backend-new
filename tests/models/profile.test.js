// tests/models/profile.test.js
const { Profile, User } = require('../../models');

describe('Profile Model', () => {
  let user;

  beforeAll(async () => {
    await Profile.sync({ force: true }); // Reset Profile table before tests
    await User.sync({ force: true }); // Reset User table before tests

    // Create a user to associate with profiles
    user = await User.create({
      email: 'profiletest@example.com',
      password_hash: 'hashedpassword',
    });
  });

  it('should create a profile with valid data', async () => {
    const profile = await Profile.create({
      user_id: user.user_id,
      name: 'Test Profile',
      avatar: 'http://example.com/avatar.png',
      bio: 'This is a test bio.',
    });

    expect(profile).toHaveProperty('profile_id');
    expect(profile.name).toBe('Test Profile');
    expect(profile.avatar).toBe('http://example.com/avatar.png');
    expect(profile.bio).toBe('This is a test bio.');
  });

  it('should not create a profile without required fields', async () => {
    await expect(Profile.create({
      user_id: user.user_id,
      avatar: 'http://example.com/avatar.png',
    })).rejects.toThrow();
  });

  it('should validate avatar URL format', async () => {
    await expect(Profile.create({
      user_id: user.user_id,
      name: 'Invalid Avatar Profile',
      avatar: 'not-a-valid-url',
      bio: 'Bio with invalid avatar URL.',
    })).rejects.toThrow();
  });

  it('should allow bio to be optional', async () => {
    const profile = await Profile.create({
      user_id: user.user_id,
      name: 'Bio-less Profile',
      avatar: 'http://example.com/avatar.png',
    });

    expect(profile.bio).toBeNull();
  });
});

// Create settings table for admin configurations and CMS content
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
// Ensure UUID generation extension exists BEFORE table creation.
      // Prefer pgcrypto's gen_random_uuid() which is widely available (e.g., Neon).
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });
      // uuid-ossp may not be available in some managed Postgres offerings; keep it best-effort only.
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', { transaction });

      await queryInterface.createTable(
        'settings',
        {
          id: {
            type: Sequelize.DataTypes.UUID,
// Use gen_random_uuid() to avoid dependency on uuid-ossp.
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          key: {
            type: Sequelize.DataTypes.STRING(100),
            allowNull: false,
            unique: true,
          },
          value: {
            type: Sequelize.DataTypes.JSONB,
            allowNull: true,
          },
          updated_by: {
            type: Sequelize.DataTypes.UUID,
            allowNull: true,
          },
          updated_at: {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('settings', ['key'], {
        name: 'idx_settings_key',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('settings', 'idx_settings_key', { transaction });
      await queryInterface.dropTable('settings', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};



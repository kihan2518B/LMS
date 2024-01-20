'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("courses", "userID", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("courses", {
      fields: ["userID"], //It is used to define that, userID is a foreign key in courses table, which refers to the id column of Users table.
      type: "foreign key",
      references: {
        table: "users",
        field: "id",
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("courses", "userID");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};

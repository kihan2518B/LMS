'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("chapters", "courseID", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("chapters", {
      fields: ["courseID"], //It is used to define that, courseID is a foreign key in chapters table, which refers to the id column of Users table.
      type: "foreign key",
      references: {
        table: "courses",
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
    await queryInterface.removeColumn("chapters", "courseID");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};

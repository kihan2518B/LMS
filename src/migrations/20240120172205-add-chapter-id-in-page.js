'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("pages", "chapterID", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("pages", {
      fields: ["chapterID"], //It is used to define that, chapterID is a foreign key in pages table, which refers to the id column of Users table.
      type: "foreign key",
      references: {
        table: "chapters",
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
    await queryInterface.removeColumn("pages", "chapterID");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};

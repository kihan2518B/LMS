'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      course.belongsTo(models.user, {
        foreignKey: "userID",
      });
      course.hasMany(models.chapter, {
        foreignKey: "courseID",
      })
    }
    static getCourse(userID) {
      return this.findAll({
        where: {
          userID,
        },
        order: [["id", "ASC"]],
      })
    }
  }
  course.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      },
    }
  }, {
    sequelize,
    modelName: 'course',
  });
  return course;
};
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
    static createenrollnment(courseid, userid) {
      return this.create({
        userID: userid,
        courseID: courseid,
      })
    }

    setcompletionstatus(bool) {
      const notbool = !bool;
      return this.update({ completed: notbool });
    }

  }
  enrollment.init({
    userID: DataTypes.INTEGER,
    courseID: DataTypes.INTEGER,
    chapterID: DataTypes.INTEGER,
    pageID: DataTypes.INTEGER,
    completed: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'enrollment',
  });
  return enrollment;
};
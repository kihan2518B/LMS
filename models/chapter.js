'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      chapter.belongsTo(models.course, {
        foreignKey: "courseID",
      });
      chapter.hasMany(models.page, {
        foreignKey: "chapterID",
      })
    }

    //creating chapter
    static createchapter({ name, discription, id }) {
      return this.create({
        name: name,
        discription: discription,
        id
      })
    }
  }
  chapter.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      }
    },
    discription: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
      }
    },
  }, {
    sequelize,
    modelName: 'chapter',
  });
  return chapter;
};
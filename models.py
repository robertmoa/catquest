from serverstuff import db
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer,String,ForeignKey
from datetime import datetime

#===USER STUFF===#

#--BASE USER TABLE--# (The reason there is the user and user stat table is for readability, and speed)

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(16),unique =True, nullable=False)
    password: Mapped[str] = mapped_column(String(200),nullable=False)

    #this links the user_stat, and makes it a 1-1 relationship
    data: Mapped["UserStat"] = db.relationship(back_populates = 'user',uselist=False,cascade='all, delete-orphan')

    #this links user_item, making it a many to many relationship
    items: Mapped[list["UserItem"]] = relationship(back_populates="user",cascade="all, delete-orphan")

#--USER STAT TABLE--# (Stores gold value, xp, level etc etc)

class UserStat(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"),unique=True)
    #shop
    gold: Mapped[int] = mapped_column(default=0)
    #dungeon
    xp: Mapped[int] = mapped_column(default=0)
    level: Mapped[int] = mapped_column(default=0)


#--USER ITEM TABLE--# (Stores record of who has purchased, linked with item and user table to give each entry in those tables a owns/owned by list)
class UserItem(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id",ondelete="CASCADE"),nullable=False)
    item_id: Mapped[int] = mapped_column(ForeignKey("item.id",ondelete="CASCADE"),nullable=False)
    purchased: Mapped[datetime]
    user: Mapped["User"] = relationship(back_populates="items")
    item: Mapped["Item"] = relationship(back_populates="owners")


#==SHOP ITEM STUFF==# - splits items into weapons and armour for those juicy juicy extra tables

#--Item Table--# (Base class for shop items. The reason it is a base is because weapons and armour have different types of stats)
class Item(db.model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40),)

    #Item types, 0: Weapon, 1: Armour, 2: other?? - tba
    itype: Mapped[str] = mapped_column(String(10),nullable=False)

    #Shop stuff
    cost = Mapped[int] = mapped_column()
    description = Mapped[str] = mapped_column(String(255))
    #because most items wont have special prompts when buying, this doesnt always have to be a non null value
    specialprompt = Mapped[list] = mapped_column(nullable=True)
    imgpath: Mapped[str] = mapped_column(String(128),nullable=False)

    __mapper_args__= {
        "polymorphic_on": type, 
        "polymorphic_identity": "default"
    }

class Sword(Item):

    id: Mapped[int] = mapped_column(ForeignKey("item.id"), primary_key=True)
    attack: Mapped[int]
    crit_chance: Mapped[float]

    __mapper_args__ = {
        "polymorphic_identity": "sword",
    }
class Armour(Item):

    id: Mapped[int] = mapped_column(ForeignKey("item.id"), primary_key=True)
    defense: Mapped[int]
    dodge_chance: Mapped[float]

    __mapper_args__ = {
        "polymorphic_identity": "armour",
    }

#==DUNGEON STUFF==#
#--Monsters table--#
class Monster(db.model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40),)
    description = Mapped[str] = mapped_column(String(255))
    imgpath: Mapped[str] = mapped_column(String(128),nullable=False)
    #-Rpg stuff-#
    #Message that will display when battle starts
    entrymsg = Mapped[str] = mapped_column(String(255),nullable=True)
    max_hp = Mapped[int] = mapped_column()
    damage = Mapped[int] = mapped_column()
    #Gold reward, can have this randomly vary
    reward = Mapped[int] = mapped_column()

    


#--CHAT HISTORY--# (Important for any web app with chat. 
# Can be used for user moderation if this was a real web app, 
# also will be used for showing correct chat history for the users session, as websockets reset on page loads)

class ChatHistory(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    time_sent: Mapped[datetime] = mapped_column(nullable=True)
    from_user: Mapped[str] = mapped_column(String(16),nullable = False)
    #as only some messages are /w messages, this will only be sometimes filled
    to_user: Mapped[str] = mapped_column(String(16),nullable=True)
    message: Mapped[str] = mapped_column(String(255))
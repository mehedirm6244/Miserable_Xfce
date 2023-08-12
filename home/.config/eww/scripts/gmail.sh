#!/bin/python

import imaplib
obj = imaplib.IMAP4_SSL('imap.gmail.com',993)
obj.login('username@gmail.com','app_password') # write your email and app password
obj.select()

cnt = len(obj.search(None, 'UnSeen')[1][0].split())
if(cnt>9):
	print("+")
else:
	print(cnt)
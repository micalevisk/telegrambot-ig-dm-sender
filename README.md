You can schedule a direct message on Instagram by scheduling a message to this Telegram bot. 

---

The external storage is a JSON like this:
> - where the key is a regular expression as string
> - just make sure the top pattern (`^bar`) doesn't match the same text as bottom pattern (`^foo`)

```json
{
  "^bar.+": {
    "target": {
      "pk": "0123456789",
      "username": "some.instagram_user"
    },
    "text": "the message that will be sent"
  },
  "^foo\\b": {
    "target": {
      "pk": "3763289512",
      "username": "jeffreyeski"
    },
    "texts": ["first message", "message two", "last message :("]
  }
}
```


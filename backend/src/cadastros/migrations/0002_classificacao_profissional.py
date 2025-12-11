from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profissional",
            name="classificacao",
            field=models.CharField(
                blank=True,
                choices=[
                    ("estagiaria", "Estagiária"),
                    ("mei", "MEI"),
                    ("freelancer", "Freelancer"),
                ],
                default="",
                max_length=20,
            ),
        ),
    ]

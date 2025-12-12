from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0003_profissional_dados_pagamento"),
    ]

    operations = [
        migrations.AddField(
            model_name="local",
            name="observacao",
            field=models.TextField(blank=True, default=""),
        ),
    ]

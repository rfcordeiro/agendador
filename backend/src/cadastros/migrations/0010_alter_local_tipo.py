from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0009_local_tipo_turnos"),
    ]

    operations = [
        migrations.AlterField(
            model_name="local",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("associacao", "Associação"),
                    ("evento", "Evento"),
                    ("clinica", "Clínica"),
                ],
                default="evento",
                help_text="Define se o local é associação, evento ou clínica.",
                max_length=20,
            ),
        ),
    ]

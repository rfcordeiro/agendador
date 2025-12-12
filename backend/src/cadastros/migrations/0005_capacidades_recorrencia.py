from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


def migrar_datas_eventuais(apps, schema_editor):
    CapacidadeSala = apps.get_model("cadastros", "CapacidadeSala")
    CapacidadeSalaEvento = apps.get_model("cadastros", "CapacidadeSalaEvento")
    db_alias = schema_editor.connection.alias
    agrupados: dict[tuple[int, str], CapacidadeSala] = {}

    for capacidade in CapacidadeSala.objects.using(db_alias).all():
        updated_fields: list[str] = []
        if not capacidade.recorrencia_tipo:
            capacidade.recorrencia_tipo = "semanal"
            updated_fields.append("recorrencia_tipo")

        if capacidade.data_especial:
            chave = (capacidade.sala_id, capacidade.turno)
            destino = agrupados.get(chave)
            if destino is None:
                destino = capacidade
                destino.recorrencia_tipo = "eventual"
                updated_fields.append("recorrencia_tipo")
                if capacidade.dia_semana is None:
                    capacidade.dia_semana = capacidade.data_especial.weekday()
                    updated_fields.append("dia_semana")
                agrupados[chave] = destino
            else:
                CapacidadeSalaEvento.objects.using(db_alias).get_or_create(
                    capacidade=destino, data=capacidade.data_especial
                )
                capacidade.delete()
                continue

            CapacidadeSalaEvento.objects.using(db_alias).get_or_create(
                capacidade=destino, data=capacidade.data_especial
            )
            capacidade.data_especial = None
            updated_fields.append("data_especial")

        if updated_fields:
            capacidade.save(update_fields=updated_fields)


def rollback_datas_eventuais(apps, schema_editor):
    CapacidadeSala = apps.get_model("cadastros", "CapacidadeSala")
    CapacidadeSalaEvento = apps.get_model("cadastros", "CapacidadeSalaEvento")
    db_alias = schema_editor.connection.alias

    for capacidade in CapacidadeSala.objects.using(db_alias).all():
        eventos = list(
            CapacidadeSalaEvento.objects.using(db_alias)
            .filter(capacidade=capacidade)
            .order_by("data")
            .values_list("data", flat=True)
        )
        if eventos:
            capacidade.data_especial = eventos[0]
            capacidade.recorrencia_tipo = capacidade.recorrencia_tipo or "semanal"
            capacidade.save(update_fields=["data_especial", "recorrencia_tipo"])
    CapacidadeSalaEvento.objects.using(db_alias).all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("cadastros", "0004_local_observacao"),
    ]

    operations = [
        migrations.AddField(
            model_name="capacidadesala",
            name="posicao_no_mes",
            field=models.SmallIntegerField(
                blank=True,
                help_text="1-4 ou -1 (último) para recorrência mensal posicional.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="capacidadesala",
            name="quinzenal_offset",
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="0 = semana atual, 1 = próxima; apenas para recorrência quinzenal.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="capacidadesala",
            name="recorrencia_tipo",
            field=models.CharField(
                choices=[
                    ("semanal", "Semanal"),
                    ("quinzenal", "Quinzenal (semana sim/não)"),
                    ("mensal_posicional", "Mensal (n-ésima/última)"),
                    ("eventual", "Eventual (datas avulsas)"),
                ],
                default="semanal",
                max_length=24,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="capacidadesala",
            name="dia_semana",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (0, "Segunda-feira"),
                    (1, "Terça-feira"),
                    (2, "Quarta-feira"),
                    (3, "Quinta-feira"),
                    (4, "Sexta-feira"),
                    (5, "Sábado"),
                    (6, "Domingo"),
                ],
                help_text="Obrigatório para recorrências semanais/quinzenais/mensais.",
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="CapacidadeSalaEvento",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("data", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "capacidade",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="eventos",
                        to="cadastros.capacidadesala",
                    ),
                ),
            ],
            options={
                "ordering": ["data"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="capacidadesala",
            unique_together=set(),
        ),
        migrations.RunPython(
            migrar_datas_eventuais,
            reverse_code=rollback_datas_eventuais,
        ),
        migrations.AddConstraint(
            model_name="capacidadesala",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("data_especial__isnull", True),
                    ("recorrencia_tipo", "semanal"),
                ),
                fields=("sala", "dia_semana", "turno"),
                name="unica_capacidade_semanal",
            ),
        ),
        migrations.AddConstraint(
            model_name="capacidadesala",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("data_especial__isnull", True),
                    ("recorrencia_tipo", "quinzenal"),
                ),
                fields=("sala", "dia_semana", "turno", "quinzenal_offset"),
                name="unica_capacidade_quinzenal",
            ),
        ),
        migrations.AddConstraint(
            model_name="capacidadesala",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("data_especial__isnull", True),
                    ("recorrencia_tipo", "mensal_posicional"),
                ),
                fields=("sala", "dia_semana", "turno", "posicao_no_mes"),
                name="unica_capacidade_mensal_posicional",
            ),
        ),
        migrations.AddConstraint(
            model_name="capacidadesala",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("data_especial__isnull", True),
                    ("recorrencia_tipo", "eventual"),
                ),
                fields=("sala", "turno"),
                name="unica_capacidade_eventual_por_turno",
            ),
        ),
        migrations.AddConstraint(
            model_name="capacidadesala",
            constraint=models.UniqueConstraint(
                condition=models.Q(("data_especial__isnull", False)),
                fields=("sala", "dia_semana", "turno", "data_especial"),
                name="unica_capacidade_data_especial",
            ),
        ),
        migrations.AddConstraint(
            model_name="capacidadesalaevento",
            constraint=models.UniqueConstraint(
                fields=("capacidade", "data"),
                name="unica_data_eventual_por_capacidade",
            ),
        ),
    ]

import { MatSnackBar } from "@angular/material/snack-bar";
import { User } from "src/app/models/users";
import { UsersService } from "src/app/services/users.service";
import { Router } from "@angular/router";
import { Component, Inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CsService } from "src/app/services/cs.service";
@Component({
  selector: "app-add-cs",
  templateUrl: "./add-cs-form.component.html",
  styleUrls: ["./add-cs-form.component.scss"],
})
export class AddCsFormComponent implements OnInit {
  registerForm: FormGroup;
  url: string;
  role = new FormControl(this.data?.role ? this.data.role : "", [
    Validators.required,
  ]);
  is_enabled: FormControl = new FormControl(
    this.data?.is_enabled ? this.data?.is_enabled : true,
    [Validators.required]
  );
  // roles = [
  //   { label: "CS", value: "cs" },
  //   { label: "CS Supervisor", value: "cs-supervisor" },
  //   { label: "Marketing", value: "marketing" },
  //   { label: "Admin", value: "admin" },
  // ];
  constructor(
    private readonly fb: FormBuilder,
    private readonly csService: CsService,
    private readonly router: Router,
    private afs: AngularFirestore,
    private readonly _snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AddCsFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User
  ) {}
  ngOnInit() {
    this.url = this.router.url;
    this.registerForm = this.fb.group({
      name: [
        this.data?.name ? this.data?.name : "",
        [Validators.required, Validators.minLength(3)],
      ],
      email: [
        this.data?.email ? this.data?.email : "",
        [Validators.required, Validators.email],
      ],
      password: ["", [Validators.required, Validators.minLength(6)]],
      is_enabled: this.is_enabled,
      role: "cs",
    });

    if (this.data) {
      this.registerForm.removeControl("password");
    }
  }

  register() {
    if (this.registerForm.valid) {
      let user: User = {
        is_enabled: this.registerForm.value.is_enabled,
        name: this.registerForm.value.name,
        email: this.registerForm.value.email,
        role: "cs",
        isAdmin: false,
        isSuperAdmin: false,
        adminId: this.data?.adminId ? this.data.adminId : "",
      };

      if (this.data) {
        this.csService.editUser(user).subscribe(
          (data) => {
            this.dialogRef.close();
            let userList = this.csService.users;

            // console.log(userList, "list");
            const userIndex = userList.findIndex(
              (elt) => elt.adminId == this.data.adminId
            );
            userList[userIndex] = user;

            // console.log(invoiceList[invoiceIndex], "invoices edited");
            this.csService.setUsersData(userList);
            this._snackBar.open("Cs user edited successfully", "X", {
              horizontalPosition: "center",
              verticalPosition: "top",
            });
          },
          (error) => {
            this._snackBar.open(error, "X", {
              horizontalPosition: "center",
              verticalPosition: "top",
            });
          }
        );
      } else {
        user.dateCreated = new Date();
        // console.log(user, "usetrrrr");
        this.csService
          .register(user, this.registerForm.value.password)
          .subscribe(
            (data) => {
              this.dialogRef.close();
              console.log(data);
              let userList = this.csService.users;
              userList.unshift(user);
              console.log("user add", user);
              this.csService.setUsersData(userList);
              this._snackBar.open("Cs user added successfully", "X", {
                horizontalPosition: "center",
                verticalPosition: "top",
              });
            },
            (error) => {
              this._snackBar.open(error, "X", {
                horizontalPosition: "center",
                verticalPosition: "top",
              });
            }
          );
        this.dialogRef.close();
      }
    } else {
      this._snackBar.open("Some fields are invalid", "X", {
        horizontalPosition: "center",
        verticalPosition: "top",
      });
    }
  }
}
